import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function SketchModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#3b2412]/35 p-3 md:place-items-center">
      <div className="relative w-full max-w-md animate-pop-in">
        <span
          aria-hidden
          className="absolute -top-7 left-6 h-14 w-16 rounded-[2rem] border-[4px] border-[#3b2412] bg-[#ffb38a] shadow-[4px_4px_0_0_#c45c26]"
        />
        <span aria-hidden className="absolute -top-2 left-10 h-3 w-3 rounded-full bg-[#3b2412]" />
        <span aria-hidden className="absolute -top-2 left-[3.4rem] h-3 w-3 rounded-full bg-[#3b2412]" />
        <div className="relative rounded-3xl border-[4px] border-[#3b2412] bg-[#b8e3a4] p-3 shadow-[8px_8px_0_0_#3d6b32]">
          <div className="rounded-3xl border-[3px] border-dashed border-[#3b2412]/70 bg-[#FFF8E7] p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="font-rounded inline-block -rotate-1 rounded-2xl border-[3px] border-[#3b2412] bg-[#ff7aa2] px-4 py-1 text-lg font-bold text-white shadow-[0_4px_0_0_#c4456e]">
                {title}
              </h2>
              <button
                type="button"
                aria-label="關閉"
                className="sketch-btn sketch-btn-warn h-10 w-10 shrink-0 text-lg"
                onClick={onClose}
              >
                ×
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SketchButton({
  tone = "confirm",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "confirm" | "cancel" | "warn" }) {
  const toneClass =
    tone === "cancel" ? "sketch-btn-cancel" : tone === "warn" ? "sketch-btn-warn" : "sketch-btn-confirm";
  return (
    <button type="button" className={`sketch-btn ${toneClass} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function SketchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`sketch-field ${props.className ?? ""}`} />;
}

export function SketchTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`sketch-field min-h-[5rem] resize-y ${props.className ?? ""}`} />;
}
