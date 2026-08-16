import { describe, expect, it } from "vitest";
import { buildTemplateTree } from "../lib/domain/templates";
import { flattenNodes } from "../lib/domain/tree";
import { createGroup, joinGroupByCode, setReviewEnabled } from "../lib/services/groupService";
import { applyPlanToGroup, addCustomLevel } from "../lib/services/planService";
import { approveEvidence, checkInDaily, submitEvidence } from "../lib/services/progressService";
import { createRepo, createUser } from "./harness";

async function setupDuo() {
  const repo = createRepo();
  const alice = await createUser(repo, "alice", "Alice");
  const bob = await createUser(repo, "bob", "Bob");
  const { group, pet } = await createGroup(repo, { owner: alice, name: "共學" });
  await joinGroupByCode(repo, { user: bob, code: group.inviteCode });
  const plan = await applyPlanToGroup(repo, {
    groupId: group.id,
    uid: "alice",
    goalText: "學測英文",
    tree: buildTemplateTree("學測英文"),
    source: "template",
    cacheKey: "學測英文",
    confirmReplace: true,
  });
  const nodes = flattenNodes(plan.tree);
  const daily = nodes.find((n) => n.nodeType === "daily")!;
  const boss = nodes.find((n) => n.nodeType === "boss" || n.nodeType === "milestone")!;
  return { repo, group, pet, plan, daily, boss, nodes };
}

describe("Phase 4 關卡、打卡、憑據與審核", () => {
  it("未打通上一關不能完成下一關", async () => {
    const { repo, plan, nodes } = await setupDuo();
    const second = nodes[1];
    await expect(
      checkInDaily(repo, { planId: plan.id, uid: "alice", nodeId: second.id }),
    ).rejects.toThrow("先打通上一關。");
  });

  it("每日任務一鍵打卡 +10 經驗，且不可重複計分", async () => {
    const { repo, plan, daily, pet } = await setupDuo();
    const first = await checkInDaily(repo, { planId: plan.id, uid: "alice", nodeId: daily.id, note: "讀了 20 分" });
    expect(first.xpGranted).toBe(10);
    expect(first.pet.xp).toBe(10);
    const again = await checkInDaily(repo, { planId: plan.id, uid: "alice", nodeId: daily.id });
    expect(again.xpGranted).toBe(0);
    expect((await repo.getPet(pet.id))?.xp).toBe(10);
    const feed = await repo.listFeed(plan.groupId);
    expect(feed.some((f) => f.type === "checkin")).toBe(true);
  });

  it("頭目無審核時上傳 jpg 立即過關 +50", async () => {
    const { repo, plan, nodes, pet } = await setupDuo();
    for (const node of nodes) {
      if (node.nodeType === "daily") {
        const p = await repo.getProgress(`${plan.id}_alice_${node.id}`);
        if (p?.status === "available") {
          await checkInDaily(repo, { planId: plan.id, uid: "alice", nodeId: node.id });
        }
      } else {
        const p = await repo.getProgress(`${plan.id}_alice_${node.id}`);
        if (p?.status === "available") {
          const result = await submitEvidence(repo, {
            planId: plan.id,
            uid: "alice",
            nodeId: node.id,
            fileUrl: "https://example.com/a.jpg",
            contentType: "image/jpeg",
            online: true,
          });
          expect(result.xpGranted).toBe(50);
        }
      }
    }
    expect((await repo.getPet(pet.id))!.xp).toBeGreaterThanOrEqual(50);
  });

  it("離線上傳憑據必須失敗並提示連網", async () => {
    const { repo, plan, daily } = await setupDuo();
    await checkInDaily(repo, { planId: plan.id, uid: "alice", nodeId: daily.id });
    const next = flattenNodes(plan.tree)[1];
    await expect(
      submitEvidence(repo, {
        planId: plan.id,
        uid: "alice",
        nodeId: next.id,
        fileUrl: "x",
        contentType: "image/png",
        online: false,
      }),
    ).rejects.toThrow("請連上網再上傳。");
  });

  it("審核開啟時上傳不加經驗，隊友通過後才 +50；上傳者不能審自己", async () => {
    const { repo, plan, group, nodes, pet } = await setupDuo();
    await setReviewEnabled(repo, group.id, "alice", true);
    for (const node of nodes) {
      const p = await repo.getProgress(`${plan.id}_alice_${node.id}`);
      if (node.nodeType === "daily" && p?.status === "available") {
        await checkInDaily(repo, { planId: plan.id, uid: "alice", nodeId: node.id });
      }
      if ((node.nodeType === "boss" || node.nodeType === "milestone") && p?.status === "available") {
        const submitted = await submitEvidence(repo, {
          planId: plan.id,
          uid: "alice",
          nodeId: node.id,
          fileUrl: "https://example.com/b.png",
          contentType: "image/png",
          online: true,
        });
        expect(submitted.xpGranted).toBe(0);
        expect(submitted.progress.status).toBe("pending_review");
        const xpAfterUpload = (await repo.getPet(pet.id))!.xp;
        await expect(
          approveEvidence(repo, { evidenceId: submitted.evidence!.id, reviewerUid: "alice" }),
        ).rejects.toThrow("不能通過自己的憑據，請請隊友幫忙。");
        const approved = await approveEvidence(repo, {
          evidenceId: submitted.evidence!.id,
          reviewerUid: "bob",
        });
        expect(approved.xpGranted).toBe(50);
        expect((await repo.getPet(pet.id))!.xp).toBe(xpAfterUpload + 50);
        return;
      }
    }
    throw new Error("沒有找到可測的頭目關卡");
  });

  it("每日任務拒絕當成憑據關卡", async () => {
    const { repo, plan, daily } = await setupDuo();
    await expect(
      submitEvidence(repo, {
        planId: plan.id,
        uid: "alice",
        nodeId: daily.id,
        fileUrl: "https://example.com/a.jpg",
        contentType: "image/jpeg",
        online: true,
      }),
    ).rejects.toThrow("一般每日任務不用上傳憑據。");
  });

  it("自訂關卡會插入地圖並為成員建立進度", async () => {
    const { repo, plan, daily, nodes } = await setupDuo();
    const following = nodes[1];
    await checkInDaily(repo, { planId: plan.id, uid: "alice", nodeId: daily.id });
    const { node } = await addCustomLevel(repo, {
      planId: plan.id,
      uid: "alice",
      afterNodeId: daily.id,
      title: "加練聽力",
      description: "聽一集 podcast",
      focusMinutes: 15,
      isBoss: false,
    });
    const refreshed = await repo.getPlan(plan.id);
    const titles = flattenNodes(refreshed!.tree).map((n) => n.title);
    expect(titles.indexOf("加練聽力")).toBe(titles.indexOf(daily.title) + 1);
    expect(node.custom).toBe(true);
    expect(node.focusMinutes).toBe(15);
    const aliceProgress = await repo.getProgress(`${plan.id}_alice_${node.id}`);
    const bobProgress = await repo.getProgress(`${plan.id}_bob_${node.id}`);
    expect(aliceProgress?.status).toBe("available");
    expect(bobProgress?.status).toBe("locked");
    expect((await repo.getProgress(`${plan.id}_alice_${following.id}`))?.status).toBe("locked");
  });

  it("空白名稱不能新增自訂關卡", async () => {
    const { repo, plan } = await setupDuo();
    await expect(
      addCustomLevel(repo, {
        planId: plan.id,
        uid: "alice",
        afterNodeId: null,
        title: "  ",
        description: "",
        focusMinutes: 25,
        isBoss: false,
      }),
    ).rejects.toThrow("請填關卡名稱。");
  });
});
