import { flattenNodes, insertNodeAfter } from "../domain/tree";
import { initialStatusForIndex, progressId } from "../domain/unlock";
import type { LevelNode, LevelTree, PlanDoc, PlanSource, ProgressDoc, ProgressStatus } from "../domain/types";
import type { AppRepository } from "../repos/types";
import { newId } from "../repos/types";
import { createGroup } from "./groupService";
import type { UserDoc } from "../domain/types";

export async function initProgressForUser(
  repo: AppRepository,
  plan: PlanDoc,
  uid: string,
): Promise<void> {
  const nodes = flattenNodes(plan.tree);
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const id = progressId(plan.id, uid, node.id);
    const existing = await repo.getProgress(id);
    if (existing) continue;
    const doc: ProgressDoc = {
      id,
      groupId: plan.groupId,
      planId: plan.id,
      uid,
      nodeId: node.id,
      status: initialStatusForIndex(i),
      note: "",
      completedAt: null,
      evidenceId: null,
    };
    await repo.saveProgress(doc);
  }
}

export async function applyPlanToGroup(
  repo: AppRepository,
  params: {
    groupId: string;
    uid: string;
    goalText: string;
    tree: LevelTree;
    source: PlanSource;
    cacheKey: string;
    confirmReplace: boolean;
  },
): Promise<PlanDoc> {
  const group = await repo.getGroup(params.groupId);
  if (!group) throw new Error("找不到群組。");
  if (group.currentPlanId && !params.confirmReplace) {
    throw new Error("REPLACE_CONFIRM");
  }
  if (group.currentPlanId) {
    const old = await repo.getPlan(group.currentPlanId);
    if (old) {
      old.status = "archived";
      await repo.savePlan(old);
    }
  }
  const plan: PlanDoc = {
    id: newId("plan"),
    groupId: params.groupId,
    goalText: params.goalText,
    source: params.source,
    cacheKey: params.cacheKey,
    tree: params.tree,
    status: "active",
    createdBy: params.uid,
    createdAt: repo.now(),
  };
  await repo.savePlan(plan);
  group.currentPlanId = plan.id;
  if (!group.name || group.name === "未命名共學群") {
    group.name = params.goalText.trim().slice(0, 20);
  }
  await repo.saveGroup(group);
  const members = await repo.listMembers(params.groupId);
  for (const m of members) {
    await initProgressForUser(repo, plan, m.uid);
  }
  return plan;
}

export async function createGroupFromPlan(
  repo: AppRepository,
  params: {
    owner: UserDoc;
    goalText: string;
    tree: LevelTree;
    source: PlanSource;
    cacheKey: string;
  },
) {
  const { group } = await createGroup(repo, {
    owner: params.owner,
    name: params.goalText.trim().slice(0, 20) || "新共學群",
  });
  const plan = await applyPlanToGroup(repo, {
    groupId: group.id,
    uid: params.owner.uid,
    goalText: params.goalText,
    tree: params.tree,
    source: params.source,
    cacheKey: params.cacheKey,
    confirmReplace: true,
  });
  const updated = await repo.getGroup(group.id);
  return { group: updated ?? group, plan };
}

export async function addCustomLevel(
  repo: AppRepository,
  params: {
    planId: string;
    uid: string;
    afterNodeId: string | null;
    title: string;
    description: string;
    focusMinutes: number;
    isBoss: boolean;
  },
): Promise<{ plan: PlanDoc; node: LevelNode }> {
  const title = params.title.trim();
  if (!title) throw new Error("請填關卡名稱。");
  const minutes = Math.round(params.focusMinutes);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180) {
    throw new Error("專注時間請填 1 到 180 分鐘。");
  }

  const plan = await repo.getPlan(params.planId);
  if (!plan || plan.status !== "active") throw new Error("這張地圖已經封存了。");
  const member = await repo.getMember(plan.groupId, params.uid);
  if (!member) throw new Error("你不在這個群組裡。");

  const node: LevelNode = {
    id: newId("node"),
    parentId: "",
    title,
    description: params.description.trim(),
    focusMinutes: minutes,
    nodeType: params.isBoss ? "boss" : "daily",
    order: 0,
    unlockRule: "previous_sibling_done",
    custom: true,
  };

  plan.tree = insertNodeAfter(plan.tree, node, params.afterNodeId);
  node.parentId = flattenNodes(plan.tree).find((n) => n.id === node.id)?.parentId || node.parentId;
  await repo.savePlan(plan);

  const nodes = flattenNodes(plan.tree);
  const index = nodes.findIndex((n) => n.id === node.id);
  const previous = index > 0 ? nodes[index - 1] : null;
  const members = await repo.listMembers(plan.groupId);

  for (const m of members) {
    let status: ProgressStatus = initialStatusForIndex(index);
    if (previous) {
      const prevDoc = await repo.getProgress(progressId(plan.id, m.uid, previous.id));
      status = prevDoc?.status === "done" ? "available" : "locked";
    }
    if (status === "available") {
      for (const later of nodes.slice(index + 1)) {
        const laterDoc = await repo.getProgress(progressId(plan.id, m.uid, later.id));
        if (laterDoc && (laterDoc.status === "available" || laterDoc.status === "pending_upload")) {
          laterDoc.status = "locked";
          await repo.saveProgress(laterDoc);
        }
      }
    }
    await repo.saveProgress({
      id: progressId(plan.id, m.uid, node.id),
      groupId: plan.groupId,
      planId: plan.id,
      uid: m.uid,
      nodeId: node.id,
      status,
      note: "",
      completedAt: null,
      evidenceId: null,
    });
  }

  return { plan, node };
}
