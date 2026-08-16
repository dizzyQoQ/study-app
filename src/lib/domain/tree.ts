import type { LevelNode, LevelStage, LevelTree, NodeType } from "./types";

export function flattenNodes(tree: LevelTree): LevelNode[] {
  return [...tree.stages]
    .sort((a, b) => a.order - b.order)
    .flatMap((stage) => [...stage.nodes].sort((a, b) => a.order - b.order));
}

export function findNode(tree: LevelTree, nodeId: string): LevelNode | undefined {
  return flattenNodes(tree).find((n) => n.id === nodeId);
}

/** 模型漏標時：每階段最後一節視為 milestone，其餘 daily */
export function normalizeTree(tree: LevelTree): LevelTree {
  const stages: LevelStage[] = tree.stages.map((stage, stageIndex) => {
    const nodes = [...stage.nodes].sort((a, b) => a.order - b.order);
    const fixed: LevelNode[] = nodes.map((node, i) => {
      const isLast = i === nodes.length - 1;
      let nodeType: NodeType = node.nodeType;
      if (nodeType !== "daily" && nodeType !== "milestone" && nodeType !== "boss") {
        nodeType = isLast ? "milestone" : "daily";
      }
      if (isLast && nodeType === "daily" && !node.custom) {
        nodeType = "milestone";
      }
      return {
        ...node,
        parentId: node.parentId || stage.id,
        nodeType,
        order: i,
        unlockRule: "previous_sibling_done",
      };
    });
    return {
      ...stage,
      order: stage.order ?? stageIndex,
      nodes: fixed,
    };
  });
  return { stages };
}

export function isBossLike(nodeType: NodeType): boolean {
  return nodeType === "boss" || nodeType === "milestone";
}

export function cloneTree(tree: LevelTree): LevelTree {
  return {
    stages: tree.stages.map((stage) => ({
      ...stage,
      nodes: stage.nodes.map((node) => ({ ...node })),
    })),
  };
}

export function insertNodeAfter(
  tree: LevelTree,
  node: LevelNode,
  afterNodeId: string | null,
): LevelTree {
  const next = cloneTree(tree);
  const stages = [...next.stages].sort((a, b) => a.order - b.order);
  if (stages.length === 0) throw new Error("地圖還沒有階段。");

  let stage = stages[stages.length - 1];
  let insertAt = stage.nodes.length;
  if (afterNodeId) {
    const found = stages.find((s) => s.nodes.some((n) => n.id === afterNodeId));
    if (!found) throw new Error("找不到插入位置。");
    stage = found;
    insertAt = stage.nodes.findIndex((n) => n.id === afterNodeId) + 1;
  }

  stage.nodes.splice(insertAt, 0, { ...node, parentId: stage.id, order: insertAt });
  stage.nodes.forEach((item, i) => {
    item.order = i;
  });
  return next;
}
