import { isBlankGoal, normalizeGoal } from "../domain/normalizeGoal";
import { buildTemplateTree } from "../domain/templates";
import { normalizeTree } from "../domain/tree";
import type { GoalCacheDoc, LevelTree, PlanSource } from "../domain/types";

export interface DecomposeDeps {
  getCache(key: string): Promise<GoalCacheDoc | null>;
  saveCache(doc: GoalCacheDoc): Promise<void>;
  callGemini(goalText: string): Promise<LevelTree>;
  now(): number;
}

export interface DecomposeResult {
  tree: LevelTree;
  source: PlanSource;
  normalizedKey: string;
}

export async function runDecomposePipeline(
  goalText: string,
  deps: DecomposeDeps,
): Promise<DecomposeResult> {
  if (isBlankGoal(goalText)) {
    throw new Error("先寫下你想學的目標。");
  }
  const normalizedKey = normalizeGoal(goalText);
  const cached = await deps.getCache(normalizedKey);
  if (cached) {
    await deps.saveCache({ ...cached, hitCount: cached.hitCount + 1 });
    return { tree: cached.tree, source: "cache", normalizedKey };
  }
  try {
    const tree = normalizeTree(await deps.callGemini(goalText));
    await deps.saveCache({
      sourceGoal: goalText.trim(),
      normalizedKey,
      tree,
      source: "gemini",
      createdAt: deps.now(),
      hitCount: 0,
    });
    return { tree, source: "gemini", normalizedKey };
  } catch {
    return {
      tree: buildTemplateTree(goalText),
      source: "template",
      normalizedKey,
    };
  }
}

export function decomposeStatusMessage(source: PlanSource): string {
  if (source === "cache") return "這是常見目標，已套用精選拆解";
  if (source === "template") return "先用範本幫你排一條路線";
  return "正在把目標拆成關卡";
}
