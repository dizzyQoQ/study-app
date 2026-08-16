import { useSession } from "../../app/session";
import { xpThresholdForLevel } from "../../lib/domain/xp";
import { EmptyGroups } from "../groups/EmptyGroups";

const ACHIEVEMENTS = [
  { id: "first_feed", title: "第一次餵養", hint: "完成第一個每日打卡" },
  { id: "first_boss", title: "首勝頭目", hint: "通過第一個頭目／里程碑" },
  { id: "level_3", title: "成長體", hint: "寵物達到 Lv3" },
] as const;

export function PetPage() {
  const { group, groups, pet, members, achievements } = useSession();
  if (!group && groups.length === 0) return <EmptyGroups />;
  const unlocked = new Set(achievements.map((a) => a.achievementId));
  const next = pet ? xpThresholdForLevel(pet.level + 1) : 100;
  const current = pet ? xpThresholdForLevel(pet.level) : 0;
  const ratio = pet ? Math.min(1, (pet.xp - current) / Math.max(1, next - current)) : 0;

  return (
    <div className="text-center">
      <h1 className="font-rounded text-3xl font-bold">寵物小隊</h1>
      <p className="mt-2 text-[#3b2412]/70">這是大家一起養的夥伴，不是個人名片。</p>
      <div className="sketch-card mx-auto mt-6 max-w-sm p-6">
      <div className="text-8xl" aria-hidden>
        {pet?.stage === "grown" ? "🦊" : pet?.stage === "hatchling" ? "🐣" : "🥚"}
      </div>
      <p className="font-display text-2xl mt-3">
        {pet?.name} · Lv.{pet?.level ?? 1}
      </p>
      <div className="mx-auto mt-3 h-3 w-64 rounded-full bg-moss-100 overflow-hidden">
        <div className="h-full bg-moss-700 transition-all" style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className="text-sm mt-2">
        {pet?.xp ?? 0} XP · 下一級 {next}
      </p>
      </div>

      <h2 className="font-display text-xl mt-10">本週餵養</h2>
      <ul className="mt-3 max-w-sm mx-auto space-y-2 text-left">
        {[...members].sort((a, b) => b.weeklyContribution - a.weeklyContribution).map((m) => (
          <li key={m.uid} className="flex justify-between rounded-2xl bg-white/80 px-4 py-2">
            <span>{m.displayName}</span>
            <span>{m.weeklyContribution} XP</span>
          </li>
        ))}
      </ul>

      <h2 className="font-display text-xl mt-10">團隊成就</h2>
      <div className="mt-3 flex justify-center gap-3">
        {ACHIEVEMENTS.map((a) => (
          <div
            key={a.id}
            className={`w-24 h-24 rounded-2xl grid place-items-center text-xs px-2 ${unlocked.has(a.id) ? "bg-gold-400" : "bg-moss-100 text-moss-800/40"}`}
            title={a.hint}
          >
            {unlocked.has(a.id) ? a.title : "剪影"}
          </div>
        ))}
      </div>
    </div>
  );
}
