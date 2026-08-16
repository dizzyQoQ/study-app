import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../../app/session";
import { EmptyGroups } from "../groups/EmptyGroups";
import { requestDecompose } from "../../lib/backend";
import { decomposeStatusMessage } from "../../lib/services/decomposeService";
import { DecomposePreview } from "../decompose/DecomposePreview";
import { applyPlanToGroup, createGroupFromPlan } from "../../lib/services/planService";
import { pickTodayRoute, ringRatio, todayRing } from "../../lib/domain/todayRoute";
import { isBossLike } from "../../lib/domain/tree";
import { NodeSheet } from "../map/NodeSheet";
import type { LevelNode, LevelTree, PlanSource, ProgressDoc } from "../../lib/domain/types";

export function HomePage() {
  const { group, groups, pet, plan, members, progressByUser, user, repo, refresh } = useSession();
  const navigate = useNavigate();
  const [goal, setGoal] = useState("");
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<{
    tree: LevelTree;
    source: PlanSource;
    key: string;
    goalText: string;
  } | null>(null);
  const [sheet, setSheet] = useState<{ node: LevelNode; progress: ProgressDoc } | null>(null);

  const myProgress = progressByUser[user.uid] ?? [];
  const byId = useMemo(() => new Map(myProgress.map((p) => [p.nodeId, p])), [myProgress]);
  const route = plan ? pickTodayRoute(plan.tree, byId) : [];

  if (!group && groups.length === 0) return <EmptyGroups />;

  return (
    <div className="space-y-6">
      <section className="sketch-card p-6">
        <p className="font-rounded text-sm font-bold tracking-[0.3em] text-[#c45c26]">COMMAND</p>
        <h1 className="font-rounded mt-1 text-3xl font-bold">你想學什麼？</h1>
        <form
          className="mt-4 flex flex-col gap-2 md:flex-row"
          onSubmit={async (e) => {
            e.preventDefault();
            setStatus("正在把目標拆成關卡");
            const result = await requestDecompose(repo, goal);
            setStatus(decomposeStatusMessage(result.source));
            setPreview({
              tree: result.tree,
              source: result.source,
              key: result.normalizedKey,
              goalText: goal,
            });
          }}
        >
          <input
            className="sketch-field flex-1"
            placeholder="例如：學測英文、學會吉他"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            aria-label="學習目標"
          />
          <button className="sketch-btn sketch-btn-confirm">一鍵拆解</button>
        </form>
        {status ? <p className="mt-3 text-sm text-[#3b2412]/70">{status}</p> : null}
      </section>

      <button
        className="sketch-card flex w-full items-center gap-4 p-5 text-left"
        onClick={() => navigate("/pet")}
      >
        <span className="text-5xl" aria-hidden>
          {pet?.stage === "grown" ? "🦊" : pet?.stage === "hatchling" ? "🐣" : "🥚"}
        </span>
        <span>
          <span className="block text-sm text-moss-800/70">群組寵物</span>
          <span className="font-display text-2xl">
            {pet?.name} · Lv.{pet?.level ?? 1}
          </span>
          <span className="mt-2 block h-2 w-48 rounded-full bg-moss-100 overflow-hidden">
            <span
              className="block h-full bg-moss-700"
              style={{ width: `${Math.min(100, ((pet?.xp ?? 0) % 100) || 0)}%` }}
            />
          </span>
        </span>
      </button>

      <section>
        <h2 className="font-display text-xl mb-3">隊友今日</h2>
        <div className="flex flex-wrap gap-4">
          {members.map((m) => {
            const ring = plan
              ? todayRing(progressByUser[m.uid] ?? [], plan.tree)
              : { numerator: 0, denominator: 0 };
            const p = ringRatio(ring.numerator, ring.denominator);
            return (
              <div key={m.uid} className="text-center">
                <div
                  className="ring-progress w-16 h-16 rounded-full grid place-items-center"
                  style={{ ["--p" as string]: p * 100 }}
                  title={`${m.displayName} ${ring.numerator}/${ring.denominator}`}
                >
                  <div className="w-12 h-12 rounded-full bg-white grid place-items-center text-sm">
                    {m.displayName.slice(0, 1)}
                  </div>
                </div>
                <p className="text-xs mt-1">{m.displayName}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl mb-3">今日路線</h2>
        {route.length === 0 ? (
          <p className="rounded-3xl bg-white/80 p-6 border border-dashed border-moss-200">
            今天地圖上沒有新關卡。去關卡地圖看看，或在上方輸入新目標。
          </p>
        ) : (
          <ol className="relative pl-6">
            <span className="absolute left-2 top-2 bottom-2 w-1 rounded-full bg-moss-200" />
            {route.map((node, i) => {
              const progress = byId.get(node.id);
              const boss = isBossLike(node.nodeType);
              return (
                <li key={node.id} className="mb-4">
                  <button
                    className={`relative w-full rounded-2xl border-[3px] border-[#3b2412] px-4 py-3 text-left ${boss ? "bg-[#3b2412] text-[#fff8e7]" : "bg-[#fff8e7]"}`}
                    onClick={() => progress && setSheet({ node, progress })}
                  >
                    <span className="absolute -left-6 top-4 w-4 h-4 rounded-full bg-gold-500" />
                    {i + 1}. {node.title}
                    {boss ? <span className="ml-2 text-xs text-gold-400">需憑據</span> : null}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {preview ? (
        <DecomposePreview
          goalText={preview.goalText}
          tree={preview.tree}
          source={preview.source}
          hasCurrentPlan={Boolean(plan)}
          onChangeTree={(tree) => setPreview({ ...preview, tree })}
          onApplyCurrent={async (confirmReplace) => {
            if (!group) return;
            await applyPlanToGroup(repo, {
              groupId: group.id,
              uid: user.uid,
              goalText: preview.goalText,
              tree: preview.tree,
              source: preview.source,
              cacheKey: preview.key,
              confirmReplace,
            });
            setPreview(null);
            await refresh();
            navigate("/map");
          }}
          onCreateGroup={async () => {
            await createGroupFromPlan(repo, {
              owner: user,
              goalText: preview.goalText,
              tree: preview.tree,
              source: preview.source,
              cacheKey: preview.key,
            });
            setPreview(null);
            await refresh();
            navigate("/map");
          }}
          onClose={() => setPreview(null)}
        />
      ) : null}
      {sheet ? <NodeSheet node={sheet.node} progress={sheet.progress} onClose={() => setSheet(null)} /> : null}
    </div>
  );
}

