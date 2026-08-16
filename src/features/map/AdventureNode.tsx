import type { LevelNode, ProgressStatus } from "../../lib/domain/types";

export function AdventureNode({
  node,
  status,
  shaking,
  selected,
  onSelect,
}: {
  node: LevelNode;
  status: ProgressStatus;
  shaking: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const boss = node.nodeType === "boss";
  const milestone = node.nodeType === "milestone";
  const monument = boss || milestone;
  const current = status === "available" || status === "pending_upload" || status === "need_resubmit";
  const box = monument ? 88 : 70;

  return (
    <div className="relative" style={{ width: box, height: box }}>
      {current && !selected ? (
        <span className="absolute -top-10 left-1/2 z-20 animate-float-y rounded-full bg-white px-3 py-1 text-[11px] font-black tracking-wide text-[#58cc02] shadow-[0_4px_0_0_#d4e8c4]">
          開始
        </span>
      ) : null}

      {current ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <span
            className="animate-node-pulse block rounded-full bg-[#58cc02]"
            style={{ width: box + 18, height: box + 18 }}
          />
        </span>
      ) : null}

      {monument ? <MonumentHat boss={boss} /> : null}

      <button
        type="button"
        data-status={status}
        aria-current={current ? "step" : undefined}
        aria-label={node.title}
        onClick={onSelect}
        className={`badge-3d relative z-10 grid h-full w-full place-items-center rounded-full border-[3.5px] text-white ${faceClass(
          status,
          monument,
        )} ${shaking ? "animate-node-wiggle" : ""} ${status === "locked" ? "opacity-[0.62]" : ""}`}
      >
        <span className="sr-only">{monument ? "石門" : "小徑"}</span>
        <NodeGlyph status={status} boss={boss} milestone={milestone} />
      </button>

      {selected ? null : (
        <p className="pointer-events-none absolute left-1/2 top-[calc(100%+10px)] w-[6.8rem] -translate-x-1/2 text-center text-[11px] font-semibold leading-tight text-moss-800/85">
          {node.title}
        </p>
      )}
    </div>
  );
}

function faceClass(status: ProgressStatus, monument: boolean): string {
  if (status === "done") {
    return monument
      ? "border-[#fff4c8] bg-gradient-to-b from-[#ffd56a] to-[#e9b949] shadow-[0_8px_0_0_#b8860b] active:shadow-[0_2px_0_0_#b8860b]"
      : "border-[#eaffc8] bg-gradient-to-b from-[#9ef01a] to-[#58cc02] shadow-[0_8px_0_0_#46a302] active:shadow-[0_2px_0_0_#46a302]";
  }
  if (status === "pending_review") {
    return "border-[#ffe0c8] bg-gradient-to-b from-[#f4a261] to-[#c45c26] shadow-[0_8px_0_0_#8f3f12] active:shadow-[0_2px_0_0_#8f3f12]";
  }
  if (status === "available" || status === "pending_upload" || status === "need_resubmit") {
    return "border-[#d4f5c8] bg-gradient-to-b from-[#5ad0ff] to-[#1cb0f6] shadow-[0_8px_0_0_#0e8fc7] active:shadow-[0_2px_0_0_#0e8fc7]";
  }
  return "border-[#f0f0f0] bg-gradient-to-b from-[#ececec] to-[#c8c8c8] shadow-[0_8px_0_0_#9a9a9a] active:shadow-[0_2px_0_0_#9a9a9a]";
}

function MonumentHat({ boss }: { boss: boolean }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -top-6 left-1/2 z-20 -translate-x-1/2 drop-shadow-md"
    >
      {boss ? <CrownIcon /> : <ChestIcon />}
    </span>
  );
}

function NodeGlyph({
  status,
  boss,
  milestone,
}: {
  status: ProgressStatus;
  boss: boolean;
  milestone: boolean;
}) {
  if (status === "locked") return <LockIcon />;
  if (status === "done") return <CheckIcon />;
  if (status === "pending_review") return <ClockIcon />;
  if (boss) return <StarIcon />;
  if (milestone) return <GemIcon />;
  return <PathStarIcon />;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" aria-hidden>
      <path
        d="M5 13.2 9.4 17.5 19 7"
        stroke="white"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden>
      <rect x="6" y="11" width="12" height="9" rx="2" fill="#8d8d8d" />
      <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" stroke="#8d8d8d" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="2.4" />
      <path d="M12 8v4.2L15 15" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function PathStarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
      <path
        fill="white"
        d="M12 3.2 14.4 9l6.2.5-4.8 3.9 1.6 6.1L12 16.3 6.6 19.5 8.2 13.4 3.4 9.5 9.6 9z"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" aria-hidden>
      <path
        fill="white"
        d="M12 2.8 14.6 9l6.6.6-5 4.2 1.6 6.4L12 16.8 6.2 20.2 7.8 13.8 2.8 9.6 9.4 9z"
      />
    </svg>
  );
}

function GemIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
      <path fill="white" d="M7 4h10l4 6-9 10L3 10z" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg viewBox="0 0 48 28" className="h-7 w-12" aria-hidden>
      <path fill="#f4c430" stroke="#c48a12" strokeWidth="1.6" d="M6 22 10 8l8 8 6-12 6 12 8-8 4 14z" />
      <rect x="6" y="20" width="36" height="6" rx="1.5" fill="#e9b949" stroke="#c48a12" strokeWidth="1.2" />
      <circle cx="10" cy="8" r="2.3" fill="#ff5d8f" />
      <circle cx="24" cy="4" r="2.3" fill="#5ad0ff" />
      <circle cx="38" cy="8" r="2.3" fill="#9ef01a" />
    </svg>
  );
}

function ChestIcon() {
  return (
    <svg viewBox="0 0 40 28" className="h-7 w-10" aria-hidden>
      <rect x="4" y="12" width="32" height="14" rx="3" fill="#c47a3a" stroke="#7a4318" strokeWidth="1.6" />
      <path d="M4 16h32" stroke="#7a4318" strokeWidth="1.6" />
      <rect x="4" y="6" width="32" height="10" rx="4" fill="#e2b07a" stroke="#7a4318" strokeWidth="1.6" />
      <rect x="17" y="13" width="6" height="7" rx="1.2" fill="#e9b949" stroke="#7a4318" strokeWidth="1.2" />
    </svg>
  );
}
