import { useEffect, useState } from "react";
import { useSession } from "../../app/session";
import { filterFeed, toggleLike } from "../../lib/services/feedService";
import { approveEvidence } from "../../lib/services/progressService";
import { EmptyGroups } from "../groups/EmptyGroups";
import type { FeedType } from "../../lib/domain/types";

const LABELS: Record<FeedType, string> = {
  checkin: "每日打卡",
  evidence_submitted: "提交憑據",
  cleared: "過關",
  pending_review: "審核中",
  pet_level_up: "寵物升級",
  achievement: "成就解鎖",
  member_joined: "新成員加入",
};

export function FeedPage() {
  const { group, groups, feed, user, repo, refresh, members } = useSession();
  const [filter, setFilter] = useState<"all" | "cleared" | "pet">("all");

  useEffect(() => {
    if (!group) return;
    void repo.setLastRead(user.uid, group.id, repo.now()).then(() => refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id]);

  if (!group && groups.length === 0) return <EmptyGroups />;
  const items = filterFeed(feed, filter);

  return (
    <div>
      <h1 className="font-rounded text-3xl font-bold">群組動態牆</h1>
      <p className="mt-1 text-[#3b2412]/70">只看目前這個群的共學片刻，沒有留言、追蹤或私訊。</p>
      <div className="mt-4 flex gap-2">
        {(["all", "cleared", "pet"] as const).map((f) => (
          <button
            key={f}
            className={`rounded-full border-[3px] border-[#3b2412] px-3 py-1 text-sm font-bold ${filter === f ? "bg-[#ff7a1a] text-white" : "bg-[#fff8e7]"}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "全部" : f === "cleared" ? "過關" : "寵物"}
          </button>
        ))}
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => {
          const author = members.find((m) => m.uid === item.uid);
          const canReview = item.type === "pending_review" && item.uid !== user.uid && item.evidenceId;
          return (
            <li key={item.id} className="sketch-card p-4">
              <p className="text-xs text-gold-500">{LABELS[item.type]}</p>
              <p className="font-medium mt-1">
                {author?.displayName ?? "隊友"} · {LABELS[item.type]}
              </p>
              {item.evidenceId ? (
                <p className="text-sm mt-1 text-moss-800/70">附有憑據縮圖（檔案已上傳）</p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <button
                  className="rounded-full bg-moss-100 px-3 py-1 text-sm"
                  onClick={async () => {
                    await toggleLike(repo, group!.id, item.id, user.uid);
                    await refresh();
                  }}
                >
                  讚 {item.likeUids.length}
                </button>
                {canReview ? (
                  <button
                    className="rounded-full bg-moss-800 text-white px-3 py-1 text-sm"
                    onClick={async () => {
                      await approveEvidence(repo, {
                        evidenceId: item.evidenceId!,
                        reviewerUid: user.uid,
                      });
                      await refresh();
                    }}
                  >
                    通過
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
