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

export interface AppRepository {
  now(): number;

  getUser(uid: string): Promise<UserDoc | null>;
  upsertUser(user: UserDoc): Promise<void>;

  getGroup(groupId: string): Promise<GroupDoc | null>;
  saveGroup(group: GroupDoc): Promise<void>;
  getGroupByInviteCode(code: string): Promise<GroupDoc | null>;
  listMemberships(uid: string): Promise<string[]>;
  setMembership(uid: string, groupId: string, joined: boolean): Promise<void>;

  getMember(groupId: string, uid: string): Promise<MemberDoc | null>;
  saveMember(groupId: string, member: MemberDoc): Promise<void>;
  deleteMember(groupId: string, uid: string): Promise<void>;
  listMembers(groupId: string): Promise<MemberDoc[]>;

  getPet(petId: string): Promise<PetDoc | null>;
  savePet(pet: PetDoc): Promise<void>;

  getPlan(planId: string): Promise<PlanDoc | null>;
  savePlan(plan: PlanDoc): Promise<void>;

  getProgress(id: string): Promise<ProgressDoc | null>;
  saveProgress(doc: ProgressDoc): Promise<void>;
  listProgressForPlanUser(planId: string, uid: string): Promise<ProgressDoc[]>;
  listProgressForPlan(planId: string): Promise<ProgressDoc[]>;

  saveEvidence(doc: EvidenceDoc): Promise<void>;
  getEvidence(id: string): Promise<EvidenceDoc | null>;

  addFeed(doc: FeedDoc): Promise<void>;
  listFeed(groupId: string): Promise<FeedDoc[]>;
  saveFeed(doc: FeedDoc): Promise<void>;

  getCache(key: string): Promise<GoalCacheDoc | null>;
  saveCache(doc: GoalCacheDoc): Promise<void>;

  getAchievement(groupId: string, achievementId: string): Promise<AchievementDoc | null>;
  saveAchievement(doc: AchievementDoc): Promise<void>;

  getLastRead(uid: string, groupId: string): Promise<number>;
  setLastRead(uid: string, groupId: string, at: number): Promise<void>;
  removeInviteIndex(code: string): Promise<void>;

  runTransaction<T>(fn: () => Promise<T>): Promise<T>;
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
