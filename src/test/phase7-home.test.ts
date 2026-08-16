import { describe, expect, it } from "vitest";
import { pickTodayRoute, todayRing } from "../lib/domain/todayRoute";
import { buildTemplateTree } from "../lib/domain/templates";
import { flattenNodes } from "../lib/domain/tree";
import { createGroup, joinGroupByCode, selectGroup } from "../lib/services/groupService";
import { applyPlanToGroup } from "../lib/services/planService";
import { checkInDaily } from "../lib/services/progressService";
import { createRepo, createUser } from "./harness";

describe("Phase 7 首頁今日路線與聯動", () => {
  it("今日路線為短路徑 1～5 個可做節點，頭目標需憑據", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const { group } = await createGroup(repo, { owner: alice, name: "A" });
    const plan = await applyPlanToGroup(repo, {
      groupId: group.id,
      uid: "alice",
      goalText: "學測英文",
      tree: buildTemplateTree("學測英文"),
      source: "template",
      cacheKey: "x",
      confirmReplace: true,
    });
    const progress = await repo.listProgressForPlanUser(plan.id, "alice");
    const byId = new Map(progress.map((p) => [p.nodeId, p]));
    const route = pickTodayRoute(plan.tree, byId);
    expect(route.length).toBeGreaterThanOrEqual(1);
    expect(route.length).toBeLessThanOrEqual(5);
  });

  it("打卡後首頁路線與隊友圈分子增加，且不混用另一群關卡", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const bob = await createUser(repo, "bob", "Bob");
    const a = await createGroup(repo, { owner: alice, name: "群A" });
    await joinGroupByCode(repo, { user: bob, code: a.group.inviteCode });
    const planA = await applyPlanToGroup(repo, {
      groupId: a.group.id,
      uid: "alice",
      goalText: "群A目標",
      tree: buildTemplateTree("群A目標"),
      source: "template",
      cacheKey: "a",
      confirmReplace: true,
    });
    const b = await createGroup(repo, { owner: alice, name: "群B" });
    const planB = await applyPlanToGroup(repo, {
      groupId: b.group.id,
      uid: "alice",
      goalText: "群B目標",
      tree: buildTemplateTree("群B目標"),
      source: "template",
      cacheKey: "b",
      confirmReplace: true,
    });
    const dailyA = flattenNodes(planA.tree).find((n) => n.nodeType === "daily")!;
    await checkInDaily(repo, { planId: planA.id, uid: "alice", nodeId: dailyA.id });

    const aliceA = await repo.listProgressForPlanUser(planA.id, "alice");
    const ring = todayRing(aliceA, planA.tree, new Date(repo.now()));
    expect(ring.numerator).toBeGreaterThan(0);
    expect(ring.denominator).toBeGreaterThan(0);
    expect(ring.denominator).toBeLessThanOrEqual(5);

    const titlesA = flattenNodes(planA.tree).map((n) => n.title);
    const titlesB = flattenNodes(planB.tree).map((n) => n.title);
    expect(titlesA.some((t) => t.includes("群A"))).toBe(true);
    expect(titlesB.some((t) => t.includes("群B"))).toBe(true);

    const user = await repo.getUser("alice");
    await selectGroup(repo, user!, b.group.id);
    expect((await repo.getUser("alice"))?.lastSelectedGroupId).toBe(b.group.id);
    const progressB = await repo.listProgressForPlanUser(planB.id, "alice");
    expect(progressB.every((p) => p.groupId === b.group.id)).toBe(true);
  });

  it("沒有可做關卡時路線為空（對應首頁空狀態）", () => {
    const tree = { stages: [] };
    const route = pickTodayRoute(tree, new Map());
    expect(route).toHaveLength(0);
  });
});
