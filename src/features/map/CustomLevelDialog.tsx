import { useState } from "react";
import { SketchButton, SketchInput, SketchModal, SketchTextarea } from "../../ui/SketchKit";

export function CustomLevelDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    description: string;
    focusMinutes: number;
    isBoss: boolean;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [focusMinutes, setFocusMinutes] = useState("25");
  const [isBoss, setIsBoss] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <SketchModal title="自訂關卡" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          setBusy(true);
          void onSubmit({
            title,
            description,
            focusMinutes: Number(focusMinutes),
            isBoss,
          })
            .catch((err) => setError(err instanceof Error ? err.message : "新增失敗"))
            .finally(() => setBusy(false));
        }}
      >
        <label className="block text-sm font-bold text-[#3b2412]">
          關卡名稱
          <SketchInput
            required
            value={title}
            placeholder="例如：複習單字 20 個"
            className="mt-1"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm font-bold text-[#3b2412]">
          關卡描述
          <SketchTextarea
            value={description}
            placeholder="想怎麼打這關？（選填）"
            className="mt-1"
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="block text-sm font-bold text-[#3b2412]">
          預計專注時間（分鐘）
          <SketchInput
            type="number"
            min={1}
            max={180}
            value={focusMinutes}
            className="mt-1"
            onChange={(e) => setFocusMinutes(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-[#3b2412]">
          <input
            type="checkbox"
            checked={isBoss}
            className="h-5 w-5 accent-[#ff7a1a]"
            onChange={(e) => setIsBoss(e.target.checked)}
          />
          這是頭目關卡（需上傳憑據）
        </label>
        {error ? <p className="text-sm text-clay-500">{error}</p> : null}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <SketchButton tone="cancel" disabled={busy} onClick={onClose}>
            取消
          </SketchButton>
          <SketchButton className="w-full" disabled={busy} type="submit">
            {busy ? "加入中…" : "加入地圖"}
          </SketchButton>
        </div>
      </form>
    </SketchModal>
  );
}
