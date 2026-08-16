import type { PetStage } from "./types";
import { XP_BOSS, XP_DAILY } from "./types";

/** 升到第 N 級需累計 N×100 的三角形累加：Lv2=100, Lv3=300, Lv4=600 */
export function xpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  return (100 * (level - 1) * level) / 2;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpThresholdForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

export function stageFromLevel(level: number): PetStage {
  if (level >= 3) return "grown";
  if (level >= 2) return "hatchling";
  return "egg";
}

export function xpForNode(nodeType: "daily" | "milestone" | "boss"): number {
  return nodeType === "daily" ? XP_DAILY : XP_BOSS;
}

export function applyXp(currentXp: number, amount: number): {
  xp: number;
  level: number;
  stage: PetStage;
  leveledUp: boolean;
  previousLevel: number;
} {
  const previousLevel = levelFromXp(currentXp);
  const xp = currentXp + amount;
  const level = levelFromXp(xp);
  return {
    xp,
    level,
    stage: stageFromLevel(level),
    leveledUp: level > previousLevel,
    previousLevel,
  };
}

export function isoWeekKey(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
