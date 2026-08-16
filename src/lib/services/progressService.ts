import { canApproveEvidence, isAllowedEvidenceType } from "../domain/access";
import { isBossLike } from "../domain/tree";
import { canAttempt, nextStatusesAfterDone, progressId } from "../domain/unlock";
import { applyXp, isoWeekKey, xpForNode } from "../domain/xp";
import type {
  AchievementDoc,
  EvidenceDoc,
  GroupDoc,
  LevelTree,
  PetDoc,
  PlanDoc,
  ProgressDoc,
} from "../domain/types";
import type { AppRepository } from "../repos/types";
import { newId } from "../repos/types";
import { addFeedItem } from "./feedService";

async function loadPlanContext(repo: AppRepository, planId: string, uid: string, nodeId: string) {
  const plan = await repo.getPlan(planId);
  if (!plan || plan.status !== "active") throw new Error("這張地圖已經封存了。");
  const group = await repo.getGroup(plan.groupId);
  if (!group || group.archived) throw new Error("找不到群組。");
  const member = await repo.getMember(group.id, uid);
  if (!member) throw new Error("你不在這個群組裡。");
  const progress = await repo.getProgress(progressId(planId, uid, nodeId));
  if (!progress) throw new Error("找不到這個關卡。");
  const pet = await repo.getPet(group.petId);
  if (!pet) throw new Error("找不到寵物。");
  return { plan, group, member, progress, pet };
}

async function maybeUnlockAchievements(
  repo: AppRepository,
  group: GroupDoc,
  pet: PetDoc,
  uid: string,
  kind: "daily" | "boss",
) {
  const tryUnlock = async (achievementId: AchievementDoc["achievementId"], event: string) => {
    const existing = await repo.getAchievement(group.id, achievementId);
    if (existing) return;
    const doc: AchievementDoc = {
      id: `${group.id}_${achievementId}`,
      groupId: group.id,
      achievementId,
      unlockedAt: repo.now(),
      unlockedByEvent: event,
    };
    await repo.saveAchievement(doc);
    await addFeedItem(repo, {
      groupId: group.id,
      type: "achievement",
      uid,
      achievementId,
    });
  };
  if (kind === "daily") await tryUnlock("first_feed", "daily");
  if (kind === "boss") await tryUnlock("first_boss", "boss");
  if (pet.level >= 3) await tryUnlock("level_3", "level");
}

async function completeNode(
  repo: AppRepository,
  params: {
    plan: PlanDoc;
    group: GroupDoc;
    pet: PetDoc;
    progress: ProgressDoc;
    uid: string;
    note?: string;
    evidenceId?: string;
  },
): Promise<{ progress: ProgressDoc; pet: PetDoc; xpGranted: number }> {
  if (params.progress.status === "done") {
    return { progress: params.progress, pet: params.pet, xpGranted: 0 };
  }
  const node = params.plan.tree.stages.flatMap((s) => s.nodes).find((n) => n.id === params.progress.nodeId);
  if (!node) throw new Error("找不到關卡資料。");

  const all = await repo.listProgressForPlanUser(params.plan.id, params.uid);
  const statusMap = new Map(all.map((p) => [p.nodeId, p.status]));
  const unlocked = nextStatusesAfterDone(params.plan.tree, statusMap, params.progress.nodeId);

  params.progress.status = "done";
  params.progress.completedAt = repo.now();
  params.progress.note = params.note ?? params.progress.note;
  if (params.evidenceId) params.progress.evidenceId = params.evidenceId;
  await repo.saveProgress(params.progress);

  for (const p of all) {
    if (p.nodeId === params.progress.nodeId) continue;
    const next = unlocked.get(p.nodeId);
    if (next && next !== p.status) {
      p.status = next;
      await repo.saveProgress(p);
    }
  }

  const amount = xpForNode(node.nodeType);
  const xp = applyXp(params.pet.xp, amount);
  params.pet.xp = xp.xp;
  params.pet.level = xp.level;
  params.pet.stage = xp.stage;
  params.pet.updatedAt = repo.now();
  await repo.savePet(params.pet);

  const member = await repo.getMember(params.group.id, params.uid);
  if (member) {
    const week = isoWeekKey(new Date(repo.now()));
    if (member.weekKey !== week) {
      member.weekKey = week;
      member.weeklyContribution = 0;
    }
    member.weeklyContribution += amount;
    member.totalContribution += amount;
    await repo.saveMember(params.group.id, member);
  }

  await addFeedItem(repo, {
    groupId: params.group.id,
    type: node.nodeType === "daily" ? "checkin" : "cleared",
    uid: params.uid,
    planId: params.plan.id,
    nodeId: node.id,
    evidenceId: params.evidenceId,
  });

  if (xp.leveledUp) {
    await addFeedItem(repo, {
      groupId: params.group.id,
      type: "pet_level_up",
      uid: params.uid,
      petLevel: params.pet.level,
    });
  }

  await maybeUnlockAchievements(
    repo,
    params.group,
    params.pet,
    params.uid,
    node.nodeType === "daily" ? "daily" : "boss",
  );

  return { progress: params.progress, pet: params.pet, xpGranted: amount };
}

export async function checkInDaily(
  repo: AppRepository,
  params: { planId: string; uid: string; nodeId: string; note?: string },
) {
  return repo.runTransaction(async () => {
    const ctx = await loadPlanContext(repo, params.planId, params.uid, params.nodeId);
    const node = ctx.plan.tree.stages.flatMap((s) => s.nodes).find((n) => n.id === params.nodeId);
    if (!node) throw new Error("找不到關卡。");
    if (isBossLike(node.nodeType)) {
      throw new Error("這關需要上傳憑據，不能只打卡。");
    }
    if (ctx.progress.status === "done") {
      return { progress: ctx.progress, pet: ctx.pet, xpGranted: 0 };
    }
    if (!canAttempt(ctx.progress.status)) {
      throw new Error("先打通上一關。");
    }
    return completeNode(repo, {
      plan: ctx.plan,
      group: ctx.group,
      pet: ctx.pet,
      progress: ctx.progress,
      uid: params.uid,
      note: params.note,
    });
  });
}

export async function submitEvidence(
  repo: AppRepository,
  params: {
    planId: string;
    uid: string;
    nodeId: string;
    fileUrl: string;
    contentType: string;
    online: boolean;
  },
) {
  if (!params.online) {
    throw new Error("請連上網再上傳。");
  }
  if (!isAllowedEvidenceType(params.contentType)) {
    throw new Error("請上傳照片或 PDF。");
  }
  return repo.runTransaction(async () => {
    const ctx = await loadPlanContext(repo, params.planId, params.uid, params.nodeId);
    const node = ctx.plan.tree.stages.flatMap((s) => s.nodes).find((n) => n.id === params.nodeId);
    if (!node) throw new Error("找不到關卡。");
    if (!isBossLike(node.nodeType)) {
      throw new Error("一般每日任務不用上傳憑據。");
    }
    if (ctx.progress.status === "done") {
      return { progress: ctx.progress, pet: ctx.pet, xpGranted: 0, evidence: null as EvidenceDoc | null };
    }
    if (!canAttempt(ctx.progress.status) && ctx.progress.status !== "pending_review") {
      throw new Error("先打通上一關。");
    }

    const evidence: EvidenceDoc = {
      id: newId("ev"),
      groupId: ctx.group.id,
      planId: ctx.plan.id,
      nodeId: params.nodeId,
      uid: params.uid,
      fileUrl: params.fileUrl,
      contentType: params.contentType,
      status: ctx.group.reviewEnabled ? "pending_review" : "approved",
      reviewedBy: null,
      reviewedAt: null,
      createdAt: repo.now(),
    };
    await repo.saveEvidence(evidence);
    ctx.progress.evidenceId = evidence.id;

    if (!ctx.group.reviewEnabled) {
      const done = await completeNode(repo, {
        plan: ctx.plan,
        group: ctx.group,
        pet: ctx.pet,
        progress: ctx.progress,
        uid: params.uid,
        evidenceId: evidence.id,
      });
      return { ...done, evidence };
    }

    ctx.progress.status = "pending_review";
    await repo.saveProgress(ctx.progress);
    await addFeedItem(repo, {
      groupId: ctx.group.id,
      type: "pending_review",
      uid: params.uid,
      planId: ctx.plan.id,
      nodeId: params.nodeId,
      evidenceId: evidence.id,
    });
    return { progress: ctx.progress, pet: ctx.pet, xpGranted: 0, evidence };
  });
}

export async function approveEvidence(
  repo: AppRepository,
  params: { evidenceId: string; reviewerUid: string },
) {
  return repo.runTransaction(async () => {
    const evidence = await repo.getEvidence(params.evidenceId);
    if (!evidence) throw new Error("找不到憑據。");
    const reviewer = await repo.getMember(evidence.groupId, params.reviewerUid);
    if (
      !canApproveEvidence({
        reviewerUid: params.reviewerUid,
        uploaderUid: evidence.uid,
        reviewerIsMember: Boolean(reviewer),
      })
    ) {
      throw new Error("不能通過自己的憑據，請請隊友幫忙。");
    }
    if (evidence.status === "approved") {
      const progress = await repo.getProgress(progressId(evidence.planId, evidence.uid, evidence.nodeId));
      const plan = await repo.getPlan(evidence.planId);
      const group = plan ? await repo.getGroup(plan.groupId) : null;
      const pet = group ? await repo.getPet(group.petId) : null;
      return { progress, pet, xpGranted: 0 };
    }
    evidence.status = "approved";
    evidence.reviewedBy = params.reviewerUid;
    evidence.reviewedAt = repo.now();
    await repo.saveEvidence(evidence);
    const ctx = await loadPlanContext(repo, evidence.planId, evidence.uid, evidence.nodeId);
    return completeNode(repo, {
      plan: ctx.plan,
      group: ctx.group,
      pet: ctx.pet,
      progress: ctx.progress,
      uid: evidence.uid,
      evidenceId: evidence.id,
    });
  });
}

export function assertNotLocked(progress: ProgressDoc, tree: LevelTree): void {
  const nodes = tree.stages.flatMap((s) => s.nodes);
  const idx = nodes.findIndex((n) => n.id === progress.nodeId);
  if (idx < 0) throw new Error("找不到關卡。");
  if (progress.status === "locked") throw new Error("先打通上一關。");
}
