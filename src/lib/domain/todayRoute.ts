import { flattenNodes } from "./tree";
import { isActiveTodayStatus } from "./unlock";
import type { LevelNode, LevelTree, ProgressDoc } from "./types";

const MAX_ROUTE = 5;

export function startOfLocalDay(now: Date = new Date()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfLocalDay(now: Date = new Date()): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function isCompletedToday(progress: ProgressDoc | undefined, now = new Date()): boolean {
  if (!progress || progress.status !== "done" || !progress.completedAt) return false;
  return progress.completedAt >= startOfLocalDay(now) && progress.completedAt <= endOfLocalDay(now);
}

export function pickTodayRoute(
  tree: LevelTree,
  progressByNodeId: Map<string, ProgressDoc>,
): LevelNode[] {
  const nodes = flattenNodes(tree);
  const active = nodes.filter((n) => isActiveTodayStatus(progressByNodeId.get(n.id)?.status));
  return active.slice(0, MAX_ROUTE);
}

/** 分母＝目前可做（含審核中）＋今日已完成，上限 5；分子＝其中已 done */
export function todayRing(progressList: ProgressDoc[], tree: LevelTree, now = new Date()): {
  numerator: number;
  denominator: number;
} {
  const byId = new Map(progressList.map((p) => [p.nodeId, p]));
  const route = pickTodayRoute(tree, byId);
  const doneToday = flattenNodes(tree)
    .map((n) => byId.get(n.id))
    .filter((p) => isCompletedToday(p, now));

  const unique = new Map<string, ProgressDoc>();
  for (const node of route) {
    const p = byId.get(node.id);
    if (p) unique.set(p.nodeId, p);
  }
  for (const p of doneToday) {
    if (p) unique.set(p.nodeId, p);
  }

  const items = [...unique.values()].slice(0, MAX_ROUTE);
  const numerator = items.filter((p) => p.status === "done").length;
  const denominator = items.length;
  return { numerator, denominator };
}

export function ringRatio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}
