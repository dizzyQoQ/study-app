import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction as fsRunTransaction,
  type Firestore,
} from "firebase/firestore";
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

function omitUndefined<T extends object>(data: T): T {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
}

export class FirebaseRepository implements AppRepository {
  constructor(private db: Firestore) {}

  now(): number {
    return Date.now();
  }

  async getUser(uid: string) {
    const snap = await getDoc(doc(this.db, "users", uid));
    return snap.exists() ? (snap.data() as UserDoc) : null;
  }
  async upsertUser(user: UserDoc) {
    await setDoc(doc(this.db, "users", user.uid), omitUndefined(user));
  }
  async getGroup(groupId: string) {
    const snap = await getDoc(doc(this.db, "groups", groupId));
    return snap.exists() ? (snap.data() as GroupDoc) : null;
  }
  async saveGroup(group: GroupDoc) {
    await setDoc(doc(this.db, "groups", group.id), omitUndefined(group));
    await setDoc(doc(this.db, "inviteIndex", group.inviteCode), { groupId: group.id });
  }
  async getGroupByInviteCode(code: string) {
    const snap = await getDoc(doc(this.db, "inviteIndex", code.trim().toUpperCase()));
    if (!snap.exists()) return null;
    return this.getGroup((snap.data() as { groupId: string }).groupId);
  }
  async listMemberships(uid: string) {
    const snap = await getDocs(collection(this.db, "users", uid, "memberships"));
    return snap.docs.map((d) => d.id);
  }
  async setMembership(uid: string, groupId: string, joined: boolean) {
    const ref = doc(this.db, "users", uid, "memberships", groupId);
    if (joined) await setDoc(ref, { groupId, joinedAt: this.now() });
    else await deleteDoc(ref);
  }
  async getMember(groupId: string, uid: string) {
    const snap = await getDoc(doc(this.db, "groups", groupId, "members", uid));
    return snap.exists() ? (snap.data() as MemberDoc) : null;
  }
  async saveMember(groupId: string, member: MemberDoc) {
    await setDoc(doc(this.db, "groups", groupId, "members", member.uid), omitUndefined(member));
  }
  async deleteMember(groupId: string, uid: string) {
    await deleteDoc(doc(this.db, "groups", groupId, "members", uid));
  }
  async listMembers(groupId: string) {
    const snap = await getDocs(collection(this.db, "groups", groupId, "members"));
    return snap.docs.map((d) => d.data() as MemberDoc);
  }
  async getPet(petId: string) {
    const snap = await getDoc(doc(this.db, "pets", petId));
    return snap.exists() ? (snap.data() as PetDoc) : null;
  }
  async savePet(pet: PetDoc) {
    await setDoc(doc(this.db, "pets", pet.id), omitUndefined(pet));
  }
  async getPlan(planId: string) {
    const snap = await getDoc(doc(this.db, "plans", planId));
    return snap.exists() ? (snap.data() as PlanDoc) : null;
  }
  async savePlan(plan: PlanDoc) {
    await setDoc(doc(this.db, "plans", plan.id), omitUndefined(plan));
  }
  async getProgress(id: string) {
    const snap = await getDoc(doc(this.db, "progress", id));
    return snap.exists() ? (snap.data() as ProgressDoc) : null;
  }
  async saveProgress(docu: ProgressDoc) {
    await setDoc(doc(this.db, "progress", docu.id), omitUndefined(docu));
  }
  async listProgressForPlanUser(planId: string, uid: string) {
    const q = query(
      collection(this.db, "progress"),
      where("planId", "==", planId),
      where("uid", "==", uid),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ProgressDoc);
  }
  async listProgressForPlan(planId: string) {
    const q = query(collection(this.db, "progress"), where("planId", "==", planId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ProgressDoc);
  }
  async saveEvidence(docu: EvidenceDoc) {
    await setDoc(doc(this.db, "evidence", docu.id), omitUndefined(docu));
  }
  async getEvidence(id: string) {
    const snap = await getDoc(doc(this.db, "evidence", id));
    return snap.exists() ? (snap.data() as EvidenceDoc) : null;
  }
  async addFeed(docu: FeedDoc) {
    await setDoc(doc(this.db, "groups", docu.groupId, "feed", docu.id), omitUndefined(docu));
  }
  async listFeed(groupId: string) {
    const q = query(collection(this.db, "groups", groupId, "feed"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as FeedDoc);
  }
  async saveFeed(docu: FeedDoc) {
    await setDoc(doc(this.db, "groups", docu.groupId, "feed", docu.id), omitUndefined(docu));
  }
  async getCache(key: string) {
    const snap = await getDoc(doc(this.db, "goalCache", key));
    return snap.exists() ? (snap.data() as GoalCacheDoc) : null;
  }
  async saveCache(docu: GoalCacheDoc) {
    await setDoc(doc(this.db, "goalCache", docu.normalizedKey), omitUndefined(docu));
  }
  async getAchievement(groupId: string, achievementId: string) {
    const snap = await getDoc(doc(this.db, "achievements", `${groupId}_${achievementId}`));
    return snap.exists() ? (snap.data() as AchievementDoc) : null;
  }
  async saveAchievement(docu: AchievementDoc) {
    await setDoc(doc(this.db, "achievements", `${docu.groupId}_${docu.achievementId}`), omitUndefined(docu));
  }
  async getLastRead(uid: string, groupId: string) {
    const snap = await getDoc(doc(this.db, "users", uid, "groupMeta", groupId));
    return snap.exists() ? ((snap.data() as { lastReadFeedAt?: number }).lastReadFeedAt ?? 0) : 0;
  }
  async setLastRead(uid: string, groupId: string, at: number) {
    await setDoc(doc(this.db, "users", uid, "groupMeta", groupId), { lastReadFeedAt: at }, { merge: true });
  }
  async removeInviteIndex(code: string) {
    await deleteDoc(doc(this.db, "inviteIndex", code.trim().toUpperCase()));
  }
  async runTransaction<T>(fn: () => Promise<T>): Promise<T> {
    return fsRunTransaction(this.db, async () => fn());
  }
}
