import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();
const geminiKey = defineSecret("GEMINI_API_KEY");

function normalizeGoal(goalText: string): string {
  return goalText.trim().replace(/\s+/g, " ").toLowerCase();
}

type NodeType = "daily" | "milestone" | "boss";
interface LevelNode {
  id: string;
  parentId: string;
  title: string;
  nodeType: NodeType;
  order: number;
  unlockRule: "previous_sibling_done";
}
interface LevelTree {
  stages: { id: string; title: string; order: number; nodes: LevelNode[] }[];
}

function template(goalText: string): LevelTree {
  const label = goalText.trim() || "學習目標";
  return {
    stages: [
      {
        id: "stage_1",
        title: `${label}：打底`,
        order: 0,
        nodes: [
          node("node_1", "stage_1", `認識「${label}」要涵蓋的範圍`, "daily", 0),
          node("node_2", "stage_1", `列出每週可投入的時間`, "daily", 1),
          node("node_3", "stage_1", `打底里程碑：完成學習計畫表`, "milestone", 2),
        ],
      },
      {
        id: "stage_2",
        title: `${label}：實作`,
        order: 1,
        nodes: [
          node("node_4", "stage_2", `完成第一個可檢驗的小練習`, "daily", 0),
          node("node_5", "stage_2", `複盤並調整下一週節奏`, "daily", 1),
          node("node_6", "stage_2", `關卡頭目：交出一份能展示的成果`, "boss", 2),
        ],
      },
    ],
  };
}

function node(id: string, parentId: string, title: string, nodeType: NodeType, order: number): LevelNode {
  return { id, parentId, title, nodeType, order, unlockRule: "previous_sibling_done" };
}

function normalizeTree(tree: LevelTree): LevelTree {
  return {
    stages: tree.stages.map((stage, si) => {
      const nodes = [...stage.nodes].sort((a, b) => a.order - b.order);
      return {
        ...stage,
        order: stage.order ?? si,
        nodes: nodes.map((n, i) => {
          const isLast = i === nodes.length - 1;
          let nodeType = n.nodeType;
          if (nodeType !== "daily" && nodeType !== "milestone" && nodeType !== "boss") {
            nodeType = isLast ? "milestone" : "daily";
          }
          if (isLast && nodeType === "daily") nodeType = "milestone";
          return { ...n, nodeType, order: i, parentId: n.parentId || stage.id, unlockRule: "previous_sibling_done" };
        }),
      };
    }),
  };
}

async function callGemini(goalText: string, apiKey: string): Promise<LevelTree> {
  if (!apiKey) throw new Error("NO_KEY");
  const prompt = `把學習目標拆成 JSON：{ "stages": [ { "id": "s1", "title": "", "order": 0, "nodes": [ { "id": "n1", "parentId": "s1", "title": "", "nodeType": "daily"|"milestone"|"boss", "order": 0 } ] } ] }。目標：${goalText}。至少兩階段，每階段含 daily 與最後一個 milestone 或 boss。只回 JSON。`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );
  if (!res.ok) throw new Error("GEMINI_HTTP");
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const json = text.replace(/^```json\s*|\s*```$/g, "");
  return normalizeTree(JSON.parse(json) as LevelTree);
}

export const decomposeGoal = onCall({ secrets: [geminiKey] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "請先登入");
  const goalText = String(request.data?.goalText ?? "");
  const normalizedKey = normalizeGoal(goalText);
  if (!normalizedKey) throw new HttpsError("invalid-argument", "先寫下你想學的目標。");
  const cacheRef = db.collection("goalCache").doc(normalizedKey);
  const cached = await cacheRef.get();
  if (cached.exists) {
    const data = cached.data()!;
    await cacheRef.update({ hitCount: (data.hitCount ?? 0) + 1 });
    return { tree: data.tree, source: "cache", normalizedKey };
  }
  try {
    const tree = await callGemini(goalText, geminiKey.value());
    await cacheRef.set({
      sourceGoal: goalText.trim(),
      normalizedKey,
      tree,
      source: "gemini",
      createdAt: Date.now(),
      hitCount: 0,
    });
    return { tree, source: "gemini", normalizedKey };
  } catch {
    return { tree: template(goalText), source: "template", normalizedKey };
  }
});
