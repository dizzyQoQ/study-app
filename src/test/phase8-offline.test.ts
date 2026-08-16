import { describe, expect, it } from "vitest";
import { buildTemplateTree } from "../lib/domain/templates";
import { flattenNodes } from "../lib/domain/tree";
import { createGroup } from "../lib/services/groupService";
import { applyPlanToGroup } from "../lib/services/planService";
import { checkInDaily, submitEvidence } from "../lib/services/progressService";
import { createRepo, createUser } from "./harness";
import { isOnline, shouldQueueDailyCheckIn, syncBannerText } from "../lib/offline";

describe("Phase 8 離線、冪等與部署約束", () => {
  it("離線提示文案符合 PRD", () => {
    expect(syncBannerText()).toBe("離線中，連上後會同步");
    expect(isOnline({ onLine: false })).toBe(false);
    expect(isOnline({ onLine: true })).toBe(true);
    expect(shouldQueueDailyCheckIn(false)).toBe(true);
    expect(shouldQueueDailyCheckIn(true)).toBe(false);
  });

  it("離線打卡連線後只生效一次（冪等）", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const { group } = await createGroup(repo, { owner: alice, name: "A" });
    const plan = await applyPlanToGroup(repo, {
      groupId: group.id,
      uid: "alice",
      goalText: "目標",
      tree: buildTemplateTree("目標"),
      source: "template",
      cacheKey: "g",
      confirmReplace: true,
    });
    const daily = flattenNodes(plan.tree).find((n) => n.nodeType === "daily")!;
    const queued = [
      () => checkInDaily(repo, { planId: plan.id, uid: "alice", nodeId: daily.id }),
      () => checkInDaily(repo, { planId: plan.id, uid: "alice", nodeId: daily.id }),
    ];
    const results = [];
    for (const job of queued) results.push(await job());
    expect(results[0].xpGranted).toBe(10);
    expect(results[1].xpGranted).toBe(0);
    expect((await repo.getPet(group.petId))?.xp).toBe(10);
  });

  it("離線不可假裝憑據上傳成功", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const { group } = await createGroup(repo, { owner: alice, name: "A" });
    const plan = await applyPlanToGroup(repo, {
      groupId: group.id,
      uid: "alice",
      goalText: "目標",
      tree: buildTemplateTree("目標"),
      source: "template",
      cacheKey: "g",
      confirmReplace: true,
    });
    const daily = flattenNodes(plan.tree).find((n) => n.nodeType === "daily")!;
    await checkInDaily(repo, { planId: plan.id, uid: "alice", nodeId: daily.id });
    const next = flattenNodes(plan.tree)[1];
    await expect(
      submitEvidence(repo, {
        planId: plan.id,
        uid: "alice",
        nodeId: next.id,
        fileUrl: "blob:offline",
        contentType: "image/jpeg",
        online: false,
      }),
    ).rejects.toThrow("請連上網再上傳。");
  });
});
