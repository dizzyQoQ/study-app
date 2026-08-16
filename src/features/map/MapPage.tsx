import { useEffect, useMemo, useState } from "react";
import { useSession } from "../../app/session";
import { EmptyGroups } from "../groups/EmptyGroups";
import { AdventureNode } from "./AdventureNode";
import { CustomLevelDialog } from "./CustomLevelDialog";
import { NodeSheet } from "./NodeSheet";
import { completedTrailPath, layoutAdventure, PATH_WIDTH, trailPath } from "./pathLayout";
import { addCustomLevel } from "../../lib/services/planService";
import type { LevelNode, ProgressDoc } from "../../lib/domain/types";

export function MapPage() {
  const { group, groups, plan, user, progressByUser, refresh, repo } = useSession();
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [addAfter, setAddAfter] = useState<string | null | false>(false);

  const mine = useMemo(
    () => new Map((progressByUser[user.uid] ?? []).map((p) => [p.nodeId, p])),
    [progressByUser, user.uid],
  );

  const layout = useMemo(() => {
    if (!plan) return null;
    return layoutAdventure(plan.tree.stages, (id) => mine.get(id));
  }, [plan, mine]);

  useEffect(() => {
    if (!sheetId && addAfter === false) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSheetId(null);
        setAddAfter(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetId, addAfter]);

  if (!group && groups.length === 0) return <EmptyGroups />;
  if (!plan || !layout) {
    return (
      <section className="rounded-3xl bg-white/80 p-8">
        <h1 className="font-display text-3xl">關卡地圖</h1>
        <p className="mt-2">這個群還沒有地圖。回到首頁輸入目標，一鍵拆解即可生成。</p>
      </section>
    );
  }

  const fullTrail = trailPath(layout.nodes);
  const doneTrail = completedTrailPath(layout.nodes);
  const selected = layout.nodes.find((item) => item.node.id === sheetId);
  const selectedProgress = selected ? mine.get(selected.node.id) : undefined;

  function openNode(node: LevelNode, progress: ProgressDoc | undefined, status: string) {
    if (status === "locked") {
      setShakeId(node.id);
      setSheetId(null);
      window.setTimeout(() => setShakeId(null), 480);
      return;
    }
    if (!progress) return;
    setAddAfter(false);
    setSheetId((cur) => (cur === node.id ? null : node.id));
  }

  return (
    <div>
      <header className="mb-5 text-center">
        <p className="text-[11px] font-bold tracking-[0.32em] text-gold-500">ADVENTURE MAP</p>
        <h1 className="font-rounded text-3xl text-moss-900">關卡地圖</h1>
        <p className="mt-1 text-moss-800/70">{plan.goalText}</p>
      </header>

      <div
        data-testid="level-tree"
        className="adventure-valley relative mx-auto w-full max-w-[26rem] overflow-visible rounded-[2rem] border-4 border-[#3b2412] shadow-[8px_8px_0_0_rgba(70,120,40,0.25)]"
        style={{ height: layout.height, minHeight: 480 }}
      >
        <svg
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
          width={PATH_WIDTH}
          height={layout.height}
          viewBox={`0 0 ${PATH_WIDTH} ${layout.height}`}
          aria-hidden
        >
          <Hills height={layout.height} />
          <Clouds />
          {fullTrail ? (
            <path
              d={fullTrail}
              fill="none"
              stroke="#7aa35a"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="0 18"
              opacity="0.55"
            />
          ) : null}
          {doneTrail ? (
            <path d={doneTrail} fill="none" stroke="#58cc02" strokeWidth="8" strokeLinecap="round" />
          ) : null}
        </svg>

        {layout.banners.map((banner, i) => (
          <ChapterBanner key={banner.stage.id} title={banner.stage.title} y={banner.y} delay={i} />
        ))}

        {layout.insertSlots.map((slot) => (
          <button
            key={slot.afterNodeId}
            type="button"
            title="在這之後新增關卡"
            aria-label="新增自訂關卡"
            className="absolute z-20 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-[#3b2412] bg-[#ffd166] text-lg font-black text-[#3b2412] shadow-[0_3px_0_0_#c48a12] active:translate-y-[-40%] active:shadow-none"
            style={{
              left: `calc(50% + ${slot.x - layout.centerX}px)`,
              top: slot.y,
            }}
            onClick={() => {
              setSheetId(null);
              setAddAfter(slot.afterNodeId);
            }}
          >
            +
          </button>
        ))}

        {layout.nodes.map((item) => {
          const progress = mine.get(item.node.id);
          return (
            <div
              key={item.node.id}
              className={`absolute ${sheetId === item.node.id ? "z-40" : "z-10"}`}
              style={{
                left: `calc(50% + ${item.x - layout.centerX}px)`,
                top: item.y,
                transform: "translate(-50%, -50%)",
              }}
            >
              <AdventureNode
                node={item.node}
                status={item.status}
                shaking={shakeId === item.node.id}
                selected={sheetId === item.node.id}
                onSelect={() => openNode(item.node, progress, item.status)}
              />
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-5 max-w-[26rem]">
        <button
          type="button"
          data-testid="add-custom-level"
          className="sketch-btn sketch-btn-confirm w-full"
          onClick={() => {
            setSheetId(null);
            setAddAfter(null);
          }}
        >
          + 新增自訂關卡
        </button>
      </div>

      {selected && selectedProgress ? (
        <NodeSheet node={selected.node} progress={selectedProgress} onClose={() => setSheetId(null)} />
      ) : null}

      {addAfter !== false ? (
        <CustomLevelDialog
          onClose={() => setAddAfter(false)}
          onSubmit={async (input) => {
            await addCustomLevel(repo, {
              planId: plan.id,
              uid: user.uid,
              afterNodeId: addAfter,
              ...input,
            });
            await refresh();
            setAddAfter(false);
          }}
        />
      ) : null}
    </div>
  );
}

function ChapterBanner({ title, y, delay }: { title: string; y: number; delay: number }) {
  return (
    <div
      className="absolute left-1/2 z-20 w-[min(19rem,88%)] animate-banner-float"
      style={{ top: y, animationDelay: `${delay * 0.4}s` }}
    >
      <span aria-hidden className="absolute -bottom-5 left-7 h-8 w-1.5 rounded-full bg-[#8b5a2b]" />
      <span aria-hidden className="absolute -bottom-5 right-7 h-8 w-1.5 rounded-full bg-[#8b5a2b]" />
      <div className="relative rounded-2xl border-[4px] border-[#3b2412] bg-gradient-to-b from-[#efc38a] to-[#c47a3a] px-4 py-2.5 text-center shadow-[0_6px_0_0_#8a4f20]">
        <p className="font-rounded text-[1.05rem] leading-snug text-[#3b2412]">{title}</p>
      </div>
    </div>
  );
}

function Hills({ height }: { height: number }) {
  return (
    <g opacity="0.35">
      <ellipse cx="40" cy={height - 36} rx="70" ry="40" fill="#6fad45" />
      <ellipse cx="320" cy={height - 28} rx="80" ry="36" fill="#5e9a38" />
      <ellipse cx="180" cy={height - 18} rx="120" ry="28" fill="#7bb84f" />
    </g>
  );
}

function Clouds() {
  return (
    <g fill="#fff" opacity="0.45">
      <ellipse cx="52" cy="42" rx="22" ry="12" />
      <ellipse cx="70" cy="42" rx="16" ry="10" />
      <ellipse cx="300" cy="58" rx="24" ry="12" />
      <ellipse cx="318" cy="58" rx="14" ry="9" />
    </g>
  );
}
