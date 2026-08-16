import { useState } from "react";
import { useSession } from "../../app/session";
import { createGroup, joinGroupByCode } from "../../lib/services/groupService";

export function GroupSwitcher() {
  const { groups, group, pet, unread, selectGroupId, repo, user, refresh } = useSession();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 rounded-2xl bg-moss-100 px-3 py-2 text-left min-w-[12rem]"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-lg" aria-hidden>
          {pet?.stage === "grown" ? "🦊" : pet?.stage === "hatchling" ? "🐣" : "🥚"}
        </span>
        <span>
          <span className="block text-sm font-medium">{group?.name ?? "尚未加入群組"}</span>
          <span className="block text-xs text-moss-800/70">
            {unread > 0 ? `${unread} 則未讀動態` : "切換共學群"}
          </span>
        </span>
      </button>
      {open ? (
        <div className="absolute z-30 mt-2 w-80 rounded-2xl bg-white shadow-xl border border-moss-100 p-2">
          <ul className="space-y-1 max-h-64 overflow-auto">
            {groups.map((g) => (
              <li key={g.id}>
                <button
                  className={`w-full text-left rounded-xl px-3 py-2 hover:bg-moss-50 ${g.id === group?.id ? "bg-moss-100" : ""}`}
                  onClick={async () => {
                    await selectGroupId(g.id);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{g.name}</span>
                  <span className="block text-xs text-moss-800/60">邀請碼 {g.inviteCode}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-moss-100 pt-2">
            <button className="rounded-xl bg-moss-800 text-white py-2 text-sm" onClick={() => setMode("create")}>
              建立群組
            </button>
            <button className="rounded-xl bg-moss-100 py-2 text-sm" onClick={() => setMode("join")}>
              加入群組
            </button>
          </div>
          {mode === "create" ? (
            <form
              className="mt-2 space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                await createGroup(repo, { owner: user, name });
                setName("");
                setMode("none");
                setOpen(false);
                await refresh();
              }}
            >
              <input
                className="w-full rounded-xl border px-3 py-2"
                placeholder="群組名稱"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button className="w-full rounded-xl bg-gold-500 py-2 text-sm">建立</button>
            </form>
          ) : null}
          {mode === "join" ? (
            <form
              className="mt-2 space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                try {
                  await joinGroupByCode(repo, { user, code });
                  setCode("");
                  setMode("none");
                  setOpen(false);
                  await refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "加入失敗");
                }
              }}
            >
              <input
                className="w-full rounded-xl border px-3 py-2 uppercase"
                placeholder="邀請碼"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              {error ? <p className="text-sm text-clay-500">{error}</p> : null}
              <button className="w-full rounded-xl bg-gold-500 py-2 text-sm">加入</button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
