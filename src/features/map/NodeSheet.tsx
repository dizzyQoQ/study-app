import { useState } from "react";
import { useSession } from "../../app/session";
import { isBossLike } from "../../lib/domain/tree";
import { canAttempt } from "../../lib/domain/unlock";
import { xpForNode } from "../../lib/domain/xp";
import { checkInDaily, submitEvidence } from "../../lib/services/progressService";
import { uploadEvidenceFile } from "../../lib/firebase/upload";
import type { LevelNode, ProgressDoc } from "../../lib/domain/types";
import { SketchButton, SketchInput, SketchModal } from "../../ui/SketchKit";
import { PomodoroPanel } from "./PomodoroPanel";

export function NodeSheet({
  node,
  progress,
  onClose,
}: {
  node: LevelNode;
  progress: ProgressDoc;
  onClose: () => void;
}) {
  return (
    <SketchModal title={isBossLike(node.nodeType) ? "頭目關卡" : "每日小徑"} onClose={onClose}>
      <NodeMissionCard node={node} progress={progress} onClose={onClose} />
    </SketchModal>
  );
}

export function NodeMissionCard({
  node,
  progress,
  onClose,
}: {
  node: LevelNode;
  progress: ProgressDoc;
  onClose: () => void;
}) {
  const { repo, user, plan, online, refresh, group } = useSession();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const boss = isBossLike(node.nodeType);
  const xp = xpForNode(node.nodeType);

  if (!plan) return null;
  const activePlan = plan;
  const actionLabel = boss
    ? progress.status === "done"
      ? "已通過"
      : progress.status === "pending_review"
        ? "審核中"
        : "出發挑戰"
    : "完成打卡";

  async function onDailyCheckIn() {
    setError("");
    setBusy(true);
    try {
      await checkInDaily(repo, {
        planId: activePlan.id,
        uid: user.uid,
        nodeId: node.id,
        note,
      });
      await refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "打卡失敗");
    } finally {
      setBusy(false);
    }
  }

  async function onEvidencePicked(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      if (!group) throw new Error("找不到群組。");
      const uploaded = await uploadEvidenceFile(file, group.id, user.uid);
      await submitEvidence(repo, {
        planId: activePlan.id,
        uid: user.uid,
        nodeId: node.id,
        fileUrl: uploaded.fileUrl,
        contentType: uploaded.contentType,
        online,
      });
      await refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <h3 id={`mission-${node.id}`} className="font-rounded text-xl font-bold leading-snug text-[#3b2412]">
          {node.title}
        </h3>
        <span className="rounded-full border-[3px] border-[#3b2412] bg-[#fff3c4] px-2 py-0.5 text-[11px] font-bold">
          +{xp} XP
        </span>
      </div>
      {node.description ? (
        <p className="mt-2 text-sm leading-relaxed text-[#3b2412]/80">{node.description}</p>
      ) : null}
      {node.focusMinutes ? (
        <p className="mt-1 text-xs font-bold text-[#3b2412]/70">建議專注 {node.focusMinutes} 分鐘</p>
      ) : null}

      {progress.status === "locked" ? (
        <p className="mt-4 text-sm">先打通上一關。</p>
      ) : boss ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm leading-relaxed text-[#3b2412]/80">這是里程碑／頭目，必須上傳照片或 PDF。</p>
          <p className="text-xs font-bold text-[#3b2412]/60">狀態：{labelStatus(progress.status)}</p>
          {progress.status !== "done" ? (
            <label className={`sketch-btn sketch-btn-confirm block cursor-pointer text-center ${busy ? "opacity-50" : ""}`}>
              {busy ? "上傳中…" : actionLabel}
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  void onEvidencePicked(e.target.files?.[0]);
                }}
              />
            </label>
          ) : (
            <p className="rounded-2xl border-[3px] border-[#3b2412] bg-[#e9f9d2] px-3 py-2 text-center text-sm font-bold">
              已通過
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm leading-relaxed text-[#3b2412]/80">低壓打卡即可，不必拍照。</p>
          <PomodoroPanel
            defaultMinutes={node.focusMinutes ?? 25}
            disabled={busy || (!canAttempt(progress.status) && progress.status !== "done")}
            onSkip={() => {
              void onDailyCheckIn();
            }}
          />
          <SketchInput
            placeholder="一句話（選填）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <SketchButton
            className="w-full"
            disabled={(!canAttempt(progress.status) && progress.status !== "done") || busy}
            onClick={() => {
              void onDailyCheckIn();
            }}
          >
            {busy ? "打卡中…" : "完成打卡"}
          </SketchButton>
        </div>
      )}
      {error ? <p className="mt-2 text-sm text-clay-500">{error}</p> : null}
    </div>
  );
}

function labelStatus(status: ProgressDoc["status"]): string {
  switch (status) {
    case "pending_review":
      return "審核中";
    case "pending_upload":
      return "待上傳";
    case "need_resubmit":
      return "請再補";
    case "done":
      return "已通過";
    default:
      return "待上傳";
  }
}
