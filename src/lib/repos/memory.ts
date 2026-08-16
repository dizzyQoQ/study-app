import type {
  AchievementDoc,
  EvidenceDoc,
  FeedDoc,
  GoalCacheDoc,
  GroupDoc,
  MemberDoc,
  PetDoc,
  PlanDoc,
  ProgressDoc,
  UserDoc,
} from "../domain/types";
import type { AppRepository } from "./types";

export class MemoryRepository implements AppRepository {
  users = new Map<string, UserDoc>();
  groups = new Map<string, GroupDoc>();
  inviteIndex = new Map<string, string>();
  memberships = new Map<string, Set<string>>();
  members = new Map<string, MemberDoc>();
  pets = new Map<string, PetDoc>();
  plans = new Map<string, PlanDoc>();
  progress = new Map<string, ProgressDoc>();
  evidence = new Map<string, EvidenceDoc>();
  feed = new Map<string, FeedDoc[]>();
  cache = new Map<string, GoalCacheDoc>();
  achievements = new Map<string, AchievementDoc>();
  lastRead = new Map<string, number>();
  clock = Date.now();

  now(): number {
    return this.clock;
  }

  async getUser(uid: string) {
    return this.users.get(uid) ?? null;
  }
  async upsertUser(user: UserDoc) {
    this.users.set(user.uid, { ...user });
  }
  async getGroup(groupId: string) {
    return this.groups.get(groupId) ?? null;
  }
  async saveGroup(group: GroupDoc) {
    group.inviteCode = group.inviteCode.toUpperCase();
    this.groups.set(group.id, { ...group });
    this.inviteIndex.set(group.inviteCode, group.id);
  }
  async getGroupByInviteCode(code: string) {
    const id = this.inviteIndex.get(code.trim().toUpperCase());
    if (!id) return null;
    return this.groups.get(id) ?? null;
  }
  async listMemberships(uid: string) {
    return [...(this.memberships.get(uid) ?? [])];
  }
  async setMembership(uid: string, groupId: string, joined: boolean) {
    const set = this.memberships.get(uid) ?? new Set<string>();
    if (joined) set.add(groupId);
    else set.delete(groupId);
    this.memberships.set(uid, set);
  }
  memberKey(groupId: string, uid: string) {
    return `${groupId}:${uid}`;
  }
  async getMember(groupId: string, uid: string) {
    return this.members.get(this.memberKey(groupId, uid)) ?? null;
  }
  async saveMember(groupId: string, member: MemberDoc) {
    this.members.set(this.memberKey(groupId, member.uid), { ...member });
  }
  async deleteMember(groupId: string, uid: string) {
    this.members.delete(this.memberKey(groupId, uid));
  }
  async listMembers(groupId: string) {
    const prefix = `${groupId}:`;
    return [...this.members.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, member]) => member);
  }
  async getPet(petId: string) {
    return this.pets.get(petId) ?? null;
  }
  async savePet(pet: PetDoc) {
    this.pets.set(pet.id, { ...pet });
  }
  async getPlan(planId: string) {
    return this.plans.get(planId) ?? null;
  }
  async savePlan(plan: PlanDoc) {
    this.plans.set(plan.id, { ...plan });
  }
  async getProgress(id: string) {
    return this.progress.get(id) ?? null;
  }
  async saveProgress(doc: ProgressDoc) {
    this.progress.set(doc.id, { ...doc });
  }
  async listProgressForPlanUser(planId: string, uid: string) {
    return [...this.progress.values()].filter((p) => p.planId === planId && p.uid === uid);
  }
  async listProgressForPlan(planId: string) {
    return [...this.progress.values()].filter((p) => p.planId === planId);
  }
  async saveEvidence(doc: EvidenceDoc) {
    this.evidence.set(doc.id, { ...doc });
  }
  async getEvidence(id: string) {
    return this.evidence.get(id) ?? null;
  }
  async addFeed(doc: FeedDoc) {
    const list = this.feed.get(doc.groupId) ?? [];
    list.unshift({ ...doc });
    this.feed.set(doc.groupId, list);
  }
  async listFeed(groupId: string) {
    return [...(this.feed.get(groupId) ?? [])];
  }
  async saveFeed(doc: FeedDoc) {
    const list = this.feed.get(doc.groupId) ?? [];
    const i = list.findIndex((f) => f.id === doc.id);
    if (i >= 0) list[i] = { ...doc };
    this.feed.set(doc.groupId, list);
  }
  async getCache(key: string) {
    return this.cache.get(key) ?? null;
  }
  async saveCache(doc: GoalCacheDoc) {
    this.cache.set(doc.normalizedKey, { ...doc });
  }
  async getAchievement(groupId: string, achievementId: string) {
    return this.achievements.get(`${groupId}_${achievementId}`) ?? null;
  }
  async saveAchievement(doc: AchievementDoc) {
    this.achievements.set(`${doc.groupId}_${doc.achievementId}`, { ...doc });
  }
  async getLastRead(uid: string, groupId: string) {
    return this.lastRead.get(`${uid}:${groupId}`) ?? 0;
  }
  async setLastRead(uid: string, groupId: string, at: number) {
    this.lastRead.set(`${uid}:${groupId}`, at);
  }
  async removeInviteIndex(code: string) {
    this.inviteIndex.delete(code.trim().toUpperCase());
  }
  async runTransaction<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}
