import { describe, expect, it } from "vitest";
import { buildTemplateTree } from "../lib/domain/templates";
import { flattenNodes } from "../lib/domain/tree";
import { createGroup, joinGroupByCode } from "../lib/services/groupService";
import { applyPlanToGroup } from "../lib/services/planService";
import { filterFeed, toggleLike, unreadCount } from "../lib/services/feedService";
import { checkInDaily } from "../lib/services/progressService";
import { createRepo, createUser } from "./harness";

describe("Phase 6 群組動態牆", () => {
  it("只顯示該群動態，切群後看不到另一群", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const a = await createGroup(repo, { owner: alice, name: "A" });
    const b = await createGroup(repo, { owner: alice, name: "B" });
    const planA = await applyPlanToGroup(repo, {
      groupId: a.group.id,
      uid: "alice",
      goalText: "A",
      tree: buildTemplateTree("A"),
      source: "template",
      cacheKey: "a",
      confirmReplace: true,
    });
    const daily = flattenNodes(planA.tree).find((n) => n.nodeType === "daily")!;
    await checkInDaily(repo, { planId: planA.id, uid: "alice", nodeId: daily.id });
    const feedA = await repo.listFeed(a.group.id);
    const feedB = await repo.listFeed(b.group.id);
    expect(feedA.some((f) => f.type === "checkin")).toBe(true);
    expect(feedB.some((f) => f.type === "checkin")).toBe(false);
  });

  it("可按讚與取消，並計算他人未讀", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const bob = await createUser(repo, "bob", "Bob");
    const { group } = await createGroup(repo, { owner: alice, name: "A" });
    await joinGroupByCode(repo, { user: bob, code: group.inviteCode });
    const plan = await applyPlanToGroup(repo, {
      groupId: group.id,
      uid: "alice",
      goalText: "A",
      tree: buildTemplateTree("A"),
      source: "template",
      cacheKey: "a",
      confirmReplace: true,
    });
    const daily = flattenNodes(plan.tree).find((n) => n.nodeType === "daily")!;
    await checkInDaily(repo, { planId: plan.id, uid: "alice", nodeId: daily.id });
    const items = await repo.listFeed(group.id);
    const checkin = items.find((f) => f.type === "checkin")!;
    await toggleLike(repo, group.id, checkin.id, "bob");
    expect((await repo.listFeed(group.id)).find((f) => f.id === checkin.id)?.likeUids).toContain("bob");
    await toggleLike(repo, group.id, checkin.id, "bob");
    expect((await repo.listFeed(group.id)).find((f) => f.id === checkin.id)?.likeUids).not.toContain("bob");
    expect(await unreadCount(repo, "bob", group.id)).toBeGreaterThan(0);
    expect(filterFeed(items, "cleared").every((f) => f.type === "cleared")).toBe(true);
    expect(filterFeed(items, "pet").every((f) => f.type === "pet_level_up" || f.type === "achievement")).toBe(
      true,
    );
  });
});
