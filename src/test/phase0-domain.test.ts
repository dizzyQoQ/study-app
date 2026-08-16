import { describe, expect, it } from "vitest";
import { normalizeGoal, isBlankGoal } from "../lib/domain/normalizeGoal";
import { generateInviteCode } from "../lib/domain/access";
import { buildTemplateTree } from "../lib/domain/templates";
import { flattenNodes } from "../lib/domain/tree";
import { levelFromXp, stageFromLevel, xpThresholdForLevel } from "../lib/domain/xp";
import { XP_BOSS, XP_DAILY } from "../lib/domain/types";

describe("領域規則常數", () => {
  it("每日 +10、頭目 +50", () => {
    expect(XP_DAILY).toBe(10);
    expect(XP_BOSS).toBe(50);
  });

  it("升級門檻 Lv2=100、Lv3=300、Lv4=600", () => {
    expect(xpThresholdForLevel(2)).toBe(100);
    expect(xpThresholdForLevel(3)).toBe(300);
    expect(xpThresholdForLevel(4)).toBe(600);
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(299)).toBe(2);
    expect(levelFromXp(300)).toBe(3);
  });

  it("寵物外觀至少三階段", () => {
    expect(stageFromLevel(1)).toBe("egg");
    expect(stageFromLevel(2)).toBe("hatchling");
    expect(stageFromLevel(3)).toBe("grown");
  });

  it("目標正規化：去空白並小寫", () => {
    expect(normalizeGoal("  學測  英文 ")).toBe("學測 英文");
    expect(normalizeGoal("TOEIC")).toBe("toeic");
    expect(isBlankGoal("   ")).toBe(true);
  });

  it("邀請碼為 6 碼且不含易混字", () => {
    const code = generateInviteCode(() => 0);
    expect(code).toHaveLength(6);
    expect(code).not.toMatch(/[0O1I]/);
  });

  it("範本至少兩階段且含 daily 與頭目／里程碑", () => {
    const tree = buildTemplateTree("學會吉他");
    expect(tree.stages.length).toBeGreaterThanOrEqual(2);
    const nodes = flattenNodes(tree);
    expect(nodes.some((n) => n.nodeType === "daily")).toBe(true);
    expect(nodes.some((n) => n.nodeType === "boss" || n.nodeType === "milestone")).toBe(true);
    expect(nodes.filter((n) => n.parentId === tree.stages[0].id).at(-1)?.nodeType).not.toBe("daily");
  });
});
