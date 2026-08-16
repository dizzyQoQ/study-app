import { useState } from "react";
import type { LevelTree, PlanSource } from "../../lib/domain/types";
import { flattenNodes } from "../../lib/domain/tree";

export function DecomposePreview({
  goalText,
  tree,
  source,
  hasCurrentPlan,
  onChangeTree,
  onApplyCurrent,
  onCreateGroup,
  onClose,
}: {
  goalText: string;
  tree: LevelTree;
  source: PlanSource;
  hasCurrentPlan: boolean;
  onChangeTree: (tree: LevelTree) => void;
  onApplyCurrent: (confirmReplace: boolean) => Promise<void>;
  onCreateGroup: () => Promise<void>;
  onClose: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const message =
    source === "cache"
      ? "這是常見目標，已套用精選拆解"
      : source === "template"
        ? "先用範本幫你排一條路線"
        : "AI 已把目標拆成關卡";

  return (
    <div className="fixed inset-0 z-40 bg-black/40 grid place-items-center p-4" role="dialog">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-auto p-6">
        <h2 className="font-display text-2xl">拆解預覽</h2>
        <p className="text-sm text-moss-800/80 mt-1">{message}</p>
        <p className="mt-2 font-medium">{goalText}</p>
        <div className="mt-4 space-y-4">
          {tree.stages.map((stage, si) => (
            <details key={stage.id} open className="rounded-2xl bg-moss-50 p-3">
              <summary className="font-medium">{stage.title}</summary>
              <ul className="mt-2 space-y-2">
                {stage.nodes.map((node, ni) => (
                  <li key={node.id} className="flex gap-2 items-center">
                    <input
                      className="flex-1 rounded-lg border px-2 py-1 text-sm"
                      value={node.title}
                      onChange={(e) => {
                        const next = structuredClone(tree);
                        next.stages[si].nodes[ni].title = e.target.value;
                        onChangeTree(next);
                      }}
                    />
                    <span className="text-xs text-moss-800/60">
                      {node.nodeType === "daily" ? "每日" : "頭目"}
                    </span>
                    <button
                      className="text-xs text-clay-500"
                      onClick={() => {
                        const next = structuredClone(tree);
                        next.stages[si].nodes = next.stages[si].nodes.filter((n) => n.id !== node.id);
                        onChangeTree(next);
                      }}
                    >
                      刪
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
        <p className="text-xs mt-3 text-moss-800/60">共 {flattenNodes(tree).length} 個關卡</p>
        <div className="mt-4 grid gap-2">
          <button
            className="rounded-xl bg-moss-800 text-white py-3"
            onClick={async () => {
              if (hasCurrentPlan && !confirm) {
                setConfirm(true);
                return;
              }
              await onApplyCurrent(true);
            }}
          >
            {hasCurrentPlan && !confirm ? "套用到目前群組" : hasCurrentPlan ? "會換成新地圖，舊進度保留在紀錄裡、但不再推進。確定？" : "套用到目前群組"}
          </button>
          <button className="rounded-xl bg-gold-500 py-3" onClick={() => void onCreateGroup()}>
            開一個新群組來養這棵樹
          </button>
          <button className="text-sm" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
