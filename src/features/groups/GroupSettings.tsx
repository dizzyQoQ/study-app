import { useState } from "react";
import { useSession } from "../../app/session";
import {
  archiveGroup,
  leaveGroup,
  regenerateInviteCode,
  setReviewEnabled,
} from "../../lib/services/groupService";

export function GroupSettings({
  onClose,
  onSignOut,
}: {
  onClose: () => void;
  onSignOut: () => Promise<void>;
}) {
  const { group, user, repo, refresh } = useSession();
  const [confirmDisband, setConfirmDisband] = useState(false);
  const isOwner = group?.ownerId === user.uid;

  return (
    <div className="fixed inset-0 z-40 bg-black/40 grid place-items-center p-4" role="dialog">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
        <h2 className="font-display text-2xl">群組設定</h2>
        {group ? (
          <>
            <div>
              <p className="text-sm text-moss-800/70">邀請碼</p>
              <div className="flex gap-2 mt-1">
                <code className="flex-1 rounded-xl bg-moss-50 px-3 py-2">{group.inviteCode}</code>
                <button
                  className="rounded-xl bg-moss-100 px-3"
                  onClick={() => void navigator.clipboard.writeText(group.inviteCode)}
                >
                  複製
                </button>
              </div>
              {isOwner ? (
                <button
                  className="mt-2 text-sm underline"
                  onClick={async () => {
                    await regenerateInviteCode(repo, group.id, user.uid);
                    await refresh();
                  }}
                >
                  重新產生邀請碼
                </button>
              ) : null}
            </div>
            {isOwner ? (
              <label className="flex items-center justify-between rounded-2xl bg-moss-50 px-4 py-3">
                <span>頭目關卡需要隊友審核</span>
                <input
                  type="checkbox"
                  checked={group.reviewEnabled}
                  onChange={async (e) => {
                    await setReviewEnabled(repo, group.id, user.uid, e.target.checked);
                    await refresh();
                  }}
                />
              </label>
            ) : (
              <p className="text-sm">審核：{group.reviewEnabled ? "已開啟" : "關閉（上傳即通過）"}</p>
            )}
            {!isOwner ? (
              <button
                className="w-full rounded-xl border py-2"
                onClick={async () => {
                  await leaveGroup(repo, group.id, user.uid);
                  await refresh();
                  onClose();
                }}
              >
                退出群組
              </button>
            ) : confirmDisband ? (
              <button
                className="w-full rounded-xl bg-clay-500 text-white py-2"
                onClick={async () => {
                  await archiveGroup(repo, group.id, user.uid);
                  await refresh();
                  onClose();
                }}
              >
                確定解散
              </button>
            ) : (
              <button className="w-full rounded-xl border py-2" onClick={() => setConfirmDisband(true)}>
                解散群組
              </button>
            )}
          </>
        ) : (
          <p>先建立或加入一個共學群。</p>
        )}
        <button className="w-full rounded-xl bg-moss-800 text-white py-2" onClick={() => void onSignOut()}>
          登出
        </button>
        <button className="w-full text-sm text-moss-800/70" onClick={onClose}>
          關閉
        </button>
      </div>
    </div>
  );
}
