import { useSession } from "../../app/session";
import { createGroup, joinGroupByCode } from "../../lib/services/groupService";
import { useState } from "react";

export function EmptyGroups() {
  const { repo, user, refresh } = useSession();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  return (
    <section className="rounded-3xl bg-white/80 p-8 shadow-sm border border-moss-100">
      <h1 className="font-display text-3xl">尚未加入任何共學群</h1>
      <p className="mt-2 text-moss-800/80">建立一個給朋友，或貼上邀請碼加入。</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          await createGroup(repo, { owner: user, name });
          await refresh();
        }}
      >
        <input
          className="w-full rounded-2xl border px-4 py-3"
          placeholder="群組名稱，例如：學測英文小隊"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="w-full rounded-2xl bg-moss-800 text-white py-3">建立群組</button>
      </form>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            await joinGroupByCode(repo, { user, code });
            await refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "加入失敗");
          }
        }}
      >
        <input
          className="w-full rounded-2xl border px-4 py-3 uppercase"
          placeholder="輸入邀請碼"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {error ? <p className="text-clay-500 text-sm">{error}</p> : null}
        <button className="w-full rounded-2xl bg-gold-500 py-3">加入群組</button>
      </form>
    </section>
  );
}
