import { useEffect, useState } from "react";
import { SketchButton, SketchInput } from "../../ui/SketchKit";

const PRESETS = [15, 25, 45];

export function PomodoroPanel({
  defaultMinutes,
  disabled,
  onSkip,
}: {
  defaultMinutes: number;
  disabled?: boolean;
  onSkip: () => void;
}) {
  const initial = clampMinutes(defaultMinutes);
  const [minutes, setMinutes] = useState(initial);
  const [custom, setCustom] = useState(String(initial));
  const [remaining, setRemaining] = useState(initial * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(id);
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  function applyMinutes(next: number) {
    const safe = clampMinutes(next);
    setMinutes(safe);
    setCustom(String(safe));
    setRemaining(safe * 60);
    setRunning(false);
    setFinished(false);
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="rounded-2xl border-[3px] border-dashed border-[#3b2412]/50 bg-white/70 p-3">
      <p className="font-rounded text-sm font-bold text-[#3b2412]">自訂番茄鐘</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled || running}
            className={`rounded-full border-[3px] border-[#3b2412] px-3 py-1 text-sm font-bold ${
              minutes === preset ? "bg-[#ffd166]" : "bg-white"
            }`}
            onClick={() => applyMinutes(preset)}
          >
            {preset}m
          </button>
        ))}
        <label className="flex items-center gap-1 text-sm font-bold text-[#3b2412]">
          自訂
          <SketchInput
            type="number"
            min={1}
            max={180}
            disabled={disabled || running}
            value={custom}
            className="w-16 py-1 text-center"
            onChange={(e) => setCustom(e.target.value)}
            onBlur={() => applyMinutes(Number(custom))}
          />
        </label>
      </div>
      <p className="font-rounded mt-3 text-center text-4xl font-bold tracking-widest text-[#3b2412]">
        {mm}:{ss}
      </p>
      {finished ? <p className="mt-1 text-center text-sm font-bold text-[#2d6a4f]">時間到，可以打卡囉！</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <SketchButton
          disabled={disabled || finished}
          onClick={() => setRunning((on) => !on)}
        >
          {running ? "暫停" : "開始專注"}
        </SketchButton>
        <SketchButton tone="cancel" disabled={disabled} onClick={onSkip}>
          跳過直接打卡
        </SketchButton>
      </div>
    </div>
  );
}

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) return 25;
  return Math.min(180, Math.max(1, Math.round(value)));
}
