import { describe, expect, it } from "vitest";
import {
  archiveGroup,
  createGroup,
  joinGroupByCode,
  leaveGroup,
  listUserGroups,
  regenerateInviteCode,
  selectGroup,
  setReviewEnabled,
} from "../lib/services/groupService";
import { createRepo, createUser } from "./harness";

describe("Phase 2 群組與邀請碼", () => {
  it("建立群組後群主為 owner、審核預設關閉、寵物 Lv1 0 經驗", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const { group, pet } = await createGroup(repo, { owner: alice, name: "學測英文" });
    expect(group.reviewEnabled).toBe(false);
    expect(group.ownerId).toBe("alice");
    expect(group.inviteCode).toHaveLength(6);
    expect(pet.level).toBe(1);
    expect(pet.xp).toBe(0);
    const saved = await repo.getUser("alice");
    expect(saved?.lastSelectedGroupId).toBe(group.id);
  });

  it("另一人用邀請碼加入後看到同一群與同一隻寵物", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const bob = await createUser(repo, "bob", "Bob");
    const { group, pet } = await createGroup(repo, { owner: alice, name: "學測英文" });
    const joined = await joinGroupByCode(repo, { user: bob, code: group.inviteCode.toLowerCase() });
    expect(joined.id).toBe(group.id);
    expect(joined.petId).toBe(pet.id);
    const members = await repo.listMembers(group.id);
    expect(members.map((m) => m.uid).sort()).toEqual(["alice", "bob"]);
    const feed = await repo.listFeed(group.id);
    expect(feed.some((f) => f.type === "member_joined" && f.uid === "bob")).toBe(true);
  });

  it("錯誤邀請碼無法加入並給白話錯誤", async () => {
    const repo = createRepo();
    const bob = await createUser(repo, "bob", "Bob");
    await expect(joinGroupByCode(repo, { user: bob, code: "ZZZZZZ" })).rejects.toThrow(
      "找不到這個邀請碼，請再問一次隊友。",
    );
  });

  it("群主重發邀請碼後舊碼失效", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const bob = await createUser(repo, "bob", "Bob");
    const { group } = await createGroup(repo, { owner: alice, name: "吉他" });
    const old = group.inviteCode;
    const next = await regenerateInviteCode(repo, group.id, "alice");
    expect(next).not.toBe(old);
    await expect(joinGroupByCode(repo, { user: bob, code: old })).rejects.toThrow(
      "找不到這個邀請碼，請再問一次隊友。",
    );
    const joined = await joinGroupByCode(repo, { user: bob, code: next });
    expect(joined.id).toBe(group.id);
  });

  it("切換群組後 lastSelectedGroupId 改變且兩群資料獨立", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const a = await createGroup(repo, { owner: alice, name: "群A" });
    const b = await createGroup(repo, { owner: alice, name: "群B" });
    const user = await repo.getUser("alice");
    expect(user?.lastSelectedGroupId).toBe(b.group.id);
    await selectGroup(repo, user!, a.group.id);
    expect((await repo.getUser("alice"))?.lastSelectedGroupId).toBe(a.group.id);
    expect(a.pet.id).not.toBe(b.pet.id);
    const groups = await listUserGroups(repo, "alice");
    expect(groups).toHaveLength(2);
  });

  it("成員可退出；群主解散後無法再加入", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const bob = await createUser(repo, "bob", "Bob");
    const { group } = await createGroup(repo, { owner: alice, name: "群" });
    await joinGroupByCode(repo, { user: bob, code: group.inviteCode });
    await leaveGroup(repo, group.id, "bob");
    expect(await repo.getMember(group.id, "bob")).toBeNull();
    await archiveGroup(repo, group.id, "alice");
    const carol = await createUser(repo, "carol", "Carol");
    await expect(joinGroupByCode(repo, { user: carol, code: group.inviteCode })).rejects.toThrow(
      "這個群組已經解散了。",
    );
  });

  it("只有群主能開關審核", async () => {
    const repo = createRepo();
    const alice = await createUser(repo, "alice", "Alice");
    const bob = await createUser(repo, "bob", "Bob");
    const { group } = await createGroup(repo, { owner: alice, name: "群" });
    await joinGroupByCode(repo, { user: bob, code: group.inviteCode });
    await setReviewEnabled(repo, group.id, "alice", true);
    expect((await repo.getGroup(group.id))?.reviewEnabled).toBe(true);
    await expect(setReviewEnabled(repo, group.id, "bob", false)).rejects.toThrow(
      "只有群主可以開關審核。",
    );
  });
});
