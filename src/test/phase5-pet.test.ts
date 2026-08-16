import { describe, expect, it } from "vitest";
import { buildTemplateTree } from "../lib/domain/templates";
import { flattenNodes } from "../lib/domain/tree";
import { levelFromXp } from "../lib/domain/xp";
import { createGroup } from "../lib/services/groupService";
import { applyPlanToGroup } from "../lib/services/planService";
import { checkInDaily } from "../lib/services/progressService";
import { createRepo, createUser } from "./harness";

describe("Phase 5 寵物與成就", () => {
  it("每群一隻寵物，A 群升級不影響 B 群", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const a = await createGroup(repo, { owner: alice, name: "A" });
    const b = await createGroup(repo, { owner: alice, name: "B" });
    const plan = await applyPlanToGroup(repo, {
      groupId: a.group.id,
      uid: "alice",
      goalText: "A目標",
      tree: buildTemplateTree("A目標"),
      source: "template",
      cacheKey: "a",
      confirmReplace: true,
    });
    const daily = flattenNodes(plan.tree).find((n) => n.nodeType === "daily")!;
    await checkInDaily(repo, { planId: plan.id, uid: "alice", nodeId: daily.id });
    expect((await repo.getPet(a.pet.id))?.xp).toBe(10);
    expect((await repo.getPet(b.pet.id))?.xp).toBe(0);
  });

  it("達成 first_feed 成就，經驗累積會升級", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const { group, pet } = await createGroup(repo, { owner: alice, name: "A" });
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
    expect(await repo.getAchievement(group.id, "first_feed")).not.toBeNull();
    const member = await repo.getMember(group.id, "alice");
    expect(member?.weeklyContribution).toBe(10);
    const updated = await repo.getPet(pet.id);
    expect(updated?.level).toBe(levelFromXp(updated!.xp));
  });

  it("寵物達到 300 XP 時解鎖 level_3", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const { group, pet } = await createGroup(repo, { owner: alice, name: "A" });
    pet.xp = 290;
    pet.level = 2;
    pet.stage = "hatchling";
    await repo.savePet(pet);
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
    const after = await repo.getPet(pet.id);
    expect(after?.xp).toBe(300);
    expect(after?.level).toBe(3);
    expect(after?.stage).toBe("grown");
    expect(await repo.getAchievement(group.id, "level_3")).not.toBeNull();
  });
});
