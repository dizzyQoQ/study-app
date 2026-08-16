import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseFirestoreRules } from "../lib/domain/access";

describe("Phase 0 雲端規則骨架", () => {
  const rules = readFileSync(path.resolve(process.cwd(), "firestore.rules"), "utf8");
  const storage = readFileSync(path.resolve(process.cwd(), "storage.rules"), "utf8");
  const parsed = parseFirestoreRules(rules);

  it("未登入預設不可讀寫業務資料", () => {
    expect(parsed.deniesUnauthenticatedDefault).toBe(true);
    expect(rules).toContain("function signedIn()");
    expect(rules).toMatch(/allow read, write: if false/);
  });

  it("群組讀取需要成員身分", () => {
    expect(parsed.requiresMemberToReadGroup).toBe(true);
    expect(rules).toContain("function isMember(groupId)");
  });

  it("群主才能改邀請與審核相關的群組欄位（owner 檢查存在）", () => {
    expect(parsed.ownerControlsReview).toBe(true);
    expect(rules).toContain("function isOwner(groupId)");
  });

  it("憑據檔只允許 jpg／png／pdf", () => {
    expect(storage).toContain("image/jpeg|image/png|application/pdf");
    expect(storage).toContain("request.auth.uid == uid");
  });

  it("Gemini 金鑰不得出現在前端公開環境範本", () => {
    const envExample = readFileSync(path.resolve(process.cwd(), ".env.example"), "utf8");
    expect(envExample).not.toMatch(/^VITE_GEMINI/m);
    expect(envExample).toContain("GEMINI_API_KEY");
  });
});
