import { generateInviteCode } from "../domain/access";
import { stageFromLevel } from "../domain/xp";
import type { GroupDoc, MemberDoc, PetDoc, UserDoc } from "../domain/types";
import type { AppRepository } from "../repos/types";
import { newId } from "../repos/types";
import { isoWeekKey } from "../domain/xp";

export async function ensureUser(
  repo: AppRepository,
  profile: { uid: string; displayName: string; photoURL: string; email: string },
): Promise<UserDoc> {
  const existing = await repo.getUser(profile.uid);
  if (existing) {
    const merged = { ...existing, ...profile };
    await repo.upsertUser(merged);
    return merged;
  }
  const user: UserDoc = {
    ...profile,
    lastSelectedGroupId: null,
    createdAt: repo.now(),
  };
  await repo.upsertUser(user);
  return user;
}

export async function createGroup(
  repo: AppRepository,
  params: { owner: UserDoc; name: string },
): Promise<{ group: GroupDoc; pet: PetDoc }> {
  const id = newId("grp");
  const petId = newId("pet");
  let inviteCode = generateInviteCode();
  while (await repo.getGroupByInviteCode(inviteCode)) {
    inviteCode = generateInviteCode();
  }
  const group: GroupDoc = {
    id,
    name: params.name.trim() || "未命名共學群",
    inviteCode,
    ownerId: params.owner.uid,
    reviewEnabled: false,
    currentPlanId: null,
    petId,
    archived: false,
    createdAt: repo.now(),
  };
  const pet: PetDoc = {
    id: petId,
    groupId: id,
    name: "共學夥伴",
    level: 1,
    xp: 0,
    stage: stageFromLevel(1),
    updatedAt: repo.now(),
  };
  const member: MemberDoc = {
    uid: params.owner.uid,
    role: "owner",
    joinedAt: repo.now(),
    weeklyContribution: 0,
    totalContribution: 0,
    weekKey: isoWeekKey(new Date(repo.now())),
    displayName: params.owner.displayName,
    photoURL: params.owner.photoURL,
  };
  await repo.saveGroup(group);
  await repo.savePet(pet);
  await repo.saveMember(id, member);
  await repo.setMembership(params.owner.uid, id, true);
  await repo.upsertUser({ ...params.owner, lastSelectedGroupId: id });
  return { group, pet };
}

export async function joinGroupByCode(
  repo: AppRepository,
  params: { user: UserDoc; code: string },
): Promise<GroupDoc> {
  const group = await repo.getGroupByInviteCode(params.code.trim().toUpperCase());
  if (!group) {
    throw new Error("找不到這個邀請碼，請再問一次隊友。");
  }
  if (group.archived) {
    throw new Error("這個群組已經解散了。");
  }
  const existing = await repo.getMember(group.id, params.user.uid);
  if (existing) {
    await repo.upsertUser({ ...params.user, lastSelectedGroupId: group.id });
    return group;
  }
  const member: MemberDoc = {
    uid: params.user.uid,
    role: "member",
    joinedAt: repo.now(),
    weeklyContribution: 0,
    totalContribution: 0,
    weekKey: isoWeekKey(new Date(repo.now())),
    displayName: params.user.displayName,
    photoURL: params.user.photoURL,
  };
  await repo.saveMember(group.id, member);
  await repo.setMembership(params.user.uid, group.id, true);
  await repo.upsertUser({ ...params.user, lastSelectedGroupId: group.id });
  if (group.currentPlanId) {
    const { initProgressForUser } = await import("./planService");
    const plan = await repo.getPlan(group.currentPlanId);
    if (plan) await initProgressForUser(repo, plan, params.user.uid);
  }
  const { addFeedItem } = await import("./feedService");
  await addFeedItem(repo, {
    groupId: group.id,
    type: "member_joined",
    uid: params.user.uid,
  });
  return group;
}

export async function selectGroup(repo: AppRepository, user: UserDoc, groupId: string): Promise<UserDoc> {
  const member = await repo.getMember(groupId, user.uid);
  if (!member) throw new Error("你不在這個群組裡。");
  const next = { ...user, lastSelectedGroupId: groupId };
  await repo.upsertUser(next);
  return next;
}

export async function regenerateInviteCode(repo: AppRepository, groupId: string, uid: string): Promise<string> {
  const group = await repo.getGroup(groupId);
  if (!group || group.ownerId !== uid) throw new Error("只有群主可以重新產生邀請碼。");
  let inviteCode = generateInviteCode();
  while (await repo.getGroupByInviteCode(inviteCode)) {
    inviteCode = generateInviteCode();
  }
  const old = group.inviteCode;
  group.inviteCode = inviteCode;
  await repo.saveGroup(group);
  await repo.removeInviteIndex(old);
  return inviteCode;
}

export async function setReviewEnabled(
  repo: AppRepository,
  groupId: string,
  uid: string,
  enabled: boolean,
): Promise<void> {
  const group = await repo.getGroup(groupId);
  if (!group || group.ownerId !== uid) throw new Error("只有群主可以開關審核。");
  group.reviewEnabled = enabled;
  await repo.saveGroup(group);
}

export async function leaveGroup(repo: AppRepository, groupId: string, uid: string): Promise<void> {
  const group = await repo.getGroup(groupId);
  if (!group) return;
  if (group.ownerId === uid) throw new Error("群主要解散群組，不能直接退出。");
  await repo.deleteMember(groupId, uid);
  await repo.setMembership(uid, groupId, false);
  const user = await repo.getUser(uid);
  if (user?.lastSelectedGroupId === groupId) {
    const rest = (await repo.listMemberships(uid)).filter((id) => id !== groupId);
    await repo.upsertUser({ ...user, lastSelectedGroupId: rest[0] ?? null });
  }
}

export async function archiveGroup(repo: AppRepository, groupId: string, uid: string): Promise<void> {
  const group = await repo.getGroup(groupId);
  if (!group || group.ownerId !== uid) throw new Error("只有群主可以解散群組。");
  group.archived = true;
  await repo.saveGroup(group);
  const members = await repo.listMembers(groupId);
  for (const m of members) {
    await repo.setMembership(m.uid, groupId, false);
    const user = await repo.getUser(m.uid);
    if (user?.lastSelectedGroupId === groupId) {
      const rest = (await repo.listMemberships(m.uid)).filter((id) => id !== groupId);
      await repo.upsertUser({ ...user, lastSelectedGroupId: rest[0] ?? null });
    }
  }
}

export async function listUserGroups(repo: AppRepository, uid: string): Promise<GroupDoc[]> {
  const ids = await repo.listMemberships(uid);
  const groups: GroupDoc[] = [];
  for (const id of ids) {
    const g = await repo.getGroup(id);
    if (g && !g.archived) groups.push(g);
  }
  return groups;
}
