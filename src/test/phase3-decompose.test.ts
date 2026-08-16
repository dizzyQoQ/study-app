import { describe, expect, it, vi } from "vitest";
import { buildTemplateTree } from "../lib/domain/templates";
import { flattenNodes, normalizeTree } from "../lib/domain/tree";
import type { LevelTree } from "../lib/domain/types";
import { runDecomposePipeline } from "../lib/services/decomposeService";
import { applyPlanToGroup, createGroupFromPlan } from "../lib/services/planService";
import { createGroup } from "../lib/services/groupService";
import { createRepo, createUser } from "./harness";

function geminiTree(title: string): LevelTree {
  return normalizeTree({
    stages: [
      {
        id: "s1",
        title: "階段一",
        order: 0,
        nodes: [
          {
            id: "n1",
            parentId: "s1",
            title: `${title} 入門`,
            nodeType: "daily",
            order: 0,
            unlockRule: "previous_sibling_done",
          },
          {
            id: "n2",
            parentId: "s1",
            title: `${title} 頭目`,
            nodeType: "boss",
            order: 1,
            unlockRule: "previous_sibling_done",
          },
        ],
      },
    ],
  });
}

describe("Phase 3 AI 拆解、快取與範本", () => {
  it("快取未命中時呼叫 Gemini 並寫入 cache", async () => {
    const repo = createRepo();
    const gemini = vi.fn(async () => geminiTree("學測英文"));
    const result = await runDecomposePipeline("學測英文", {
      getCache: (k) => repo.getCache(k),
      saveCache: (d) => repo.saveCache(d),
      callGemini: gemini,
      now: () => repo.now(),
    });
    expect(result.source).toBe("gemini");
    expect(gemini).toHaveBeenCalledOnce();
    expect((await repo.getCache(result.normalizedKey))?.source).toBe("gemini");
  });

  it("正規化後相同目標第二次不呼叫 Gemini，hitCount 增加", async () => {
    const repo = createRepo();
    const gemini = vi.fn(async () => geminiTree("學測英文"));
    const deps = {
      getCache: (k: string) => repo.getCache(k),
      saveCache: (d: Parameters<typeof repo.saveCache>[0]) => repo.saveCache(d),
      callGemini: gemini,
      now: () => repo.now(),
    };
    await runDecomposePipeline("學測英文", deps);
    const second = await runDecomposePipeline("  學測英文  ", deps);
    expect(second.source).toBe("cache");
    expect(gemini).toHaveBeenCalledOnce();
    expect((await repo.getCache(second.normalizedKey))?.hitCount).toBe(1);
  });

  it("Gemini 失敗走範本且不寫入快取", async () => {
    const repo = createRepo();
    const result = await runDecomposePipeline("學會吉他", {
      getCache: (k) => repo.getCache(k),
      saveCache: (d) => repo.saveCache(d),
      callGemini: async () => {
        throw new Error("no key");
      },
      now: () => repo.now(),
    });
    expect(result.source).toBe("template");
    expect(result.tree.stages.length).toBeGreaterThanOrEqual(2);
    expect(await repo.getCache(result.normalizedKey)).toBeNull();
  });

  it("漏標的樹會把每階段最後一節補成里程碑", () => {
    const tree = normalizeTree({
      stages: [
        {
          id: "s",
          title: "s",
          order: 0,
          nodes: [
            {
              id: "a",
              parentId: "s",
              title: "a",
              nodeType: "daily",
              order: 0,
              unlockRule: "previous_sibling_done",
            },
            {
              id: "b",
              parentId: "s",
              title: "b",
              nodeType: "daily",
              order: 1,
              unlockRule: "previous_sibling_done",
            },
          ],
        },
      ],
    });
    expect(flattenNodes(tree)[1].nodeType).toBe("milestone");
  });

  it("套用目前群組需二次確認，舊 plan 封存且寵物經驗不清零", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const { group, pet } = await createGroup(repo, { owner: alice, name: "舊群" });
    pet.xp = 40;
    pet.level = 1;
    await repo.savePet(pet);
    const first = await applyPlanToGroup(repo, {
      groupId: group.id,
      uid: "alice",
      goalText: "舊目標",
      tree: buildTemplateTree("舊目標"),
      source: "template",
      cacheKey: "舊目標",
      confirmReplace: true,
    });
    await expect(
      applyPlanToGroup(repo, {
        groupId: group.id,
        uid: "alice",
        goalText: "新目標",
        tree: buildTemplateTree("新目標"),
        source: "template",
        cacheKey: "新目標",
        confirmReplace: false,
      }),
    ).rejects.toThrow("REPLACE_CONFIRM");
    const second = await applyPlanToGroup(repo, {
      groupId: group.id,
      uid: "alice",
      goalText: "新目標",
      tree: buildTemplateTree("新目標"),
      source: "template",
      cacheKey: "新目標",
      confirmReplace: true,
    });
    expect((await repo.getPlan(first.id))?.status).toBe("archived");
    expect((await repo.getPlan(second.id))?.status).toBe("active");
    expect((await repo.getGroup(group.id))?.currentPlanId).toBe(second.id);
    expect((await repo.getPet(pet.id))?.xp).toBe(40);
  });

  it("可開新群組來養這棵樹", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const { group, plan } = await createGroupFromPlan(repo, {
      owner: alice,
      goalText: "學會吉他",
      tree: buildTemplateTree("學會吉他"),
      source: "template",
      cacheKey: "學會吉他",
    });
    expect(plan.groupId).toBe(group.id);
    expect(group.currentPlanId).toBe(plan.id);
    const progress = await repo.listProgressForPlanUser(plan.id, "alice");
    expect(progress.some((p) => p.status === "available")).toBe(true);
    expect(progress.filter((p) => p.status === "locked").length).toBeGreaterThan(0);
  });
});
