import { normalizeTree } from "./tree";
import type { LevelTree } from "./types";

function id(prefix: string, n: number): string {
  return `${prefix}_${n}`;
}

/** 無 API 時的基礎範本：至少兩階段，每階段含 daily 與一個頭目／里程碑 */
export function buildTemplateTree(goalText: string): LevelTree {
  const label = goalText.trim() || "學習目標";
  const raw: LevelTree = {
    stages: [
      {
        id: id("stage", 1),
        title: `${label}：打底`,
        order: 0,
        nodes: [
          {
            id: id("node", 1),
            parentId: id("stage", 1),
            title: `認識「${label}」要涵蓋的範圍`,
            nodeType: "daily",
            order: 0,
            unlockRule: "previous_sibling_done",
          },
          {
            id: id("node", 2),
            parentId: id("stage", 1),
            title: `列出每週可投入的時間`,
            nodeType: "daily",
            order: 1,
            unlockRule: "previous_sibling_done",
          },
          {
            id: id("node", 3),
            parentId: id("stage", 1),
            title: `打底里程碑：完成學習計畫表`,
            nodeType: "milestone",
            order: 2,
            unlockRule: "previous_sibling_done",
          },
        ],
      },
      {
        id: id("stage", 2),
        title: `${label}：實作`,
        order: 1,
        nodes: [
          {
            id: id("node", 4),
            parentId: id("stage", 2),
            title: `完成第一個可檢驗的小練習`,
            nodeType: "daily",
            order: 0,
            unlockRule: "previous_sibling_done",
          },
          {
            id: id("node", 5),
            parentId: id("stage", 2),
            title: `複盤並調整下一週節奏`,
            nodeType: "daily",
            order: 1,
            unlockRule: "previous_sibling_done",
          },
          {
            id: id("node", 6),
            parentId: id("stage", 2),
            title: `關卡頭目：交出一份能展示的成果`,
            nodeType: "boss",
            order: 2,
            unlockRule: "previous_sibling_done",
          },
        ],
      },
    ],
  };
  return normalizeTree(raw);
}
