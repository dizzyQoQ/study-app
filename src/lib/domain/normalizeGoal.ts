/** trim → 連續空白壓成單一空白 → 英文小寫 */
export function normalizeGoal(goalText: string): string {
  return goalText.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isBlankGoal(goalText: string): boolean {
  return normalizeGoal(goalText).length === 0;
}
