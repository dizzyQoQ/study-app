import { flattenNodes } from "./tree";
import type { LevelTree, ProgressStatus } from "./types";

export function progressId(planId: string, uid: string, nodeId: string): string {
  return `${planId}_${uid}_${nodeId}`;
}

export function initialStatusForIndex(index: number): ProgressStatus {
  return index === 0 ? "available" : "locked";
}

export function nextStatusesAfterDone(
  tree: LevelTree,
  current: Map<string, ProgressStatus>,
  completedNodeId: string,
): Map<string, ProgressStatus> {
  const nodes = flattenNodes(tree);
  const next = new Map(current);
  next.set(completedNodeId, "done");
  const idx = nodes.findIndex((n) => n.id === completedNodeId);
  const following = nodes[idx + 1];
  if (following) {
    const status = next.get(following.id);
    if (status === "locked" || !status) {
      next.set(following.id, "available");
    }
  }
  return next;
}

export function canAttempt(status: ProgressStatus | undefined): boolean {
  return status === "available" || status === "pending_upload" || status === "need_resubmit";
}

export function isActiveTodayStatus(status: ProgressStatus | undefined): boolean {
  return status === "available" || status === "pending_upload" || status === "pending_review";
}
