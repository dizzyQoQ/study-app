import { isBossLike } from "../../lib/domain/tree";
import type { LevelNode, LevelStage, ProgressDoc, ProgressStatus } from "../../lib/domain/types";

export const PATH_WIDTH = 360;
export const NODE_SPACING = 128;
export const BANNER_BLOCK = 112;
export const TOP_PAD = 36;
export const BOTTOM_PAD = 88;

const SNAKE = [-40, 0, 40, 0] as const;

export function snakeOffset(index: number): number {
  return SNAKE[index % SNAKE.length];
}

export interface LaidOutNode {
  node: LevelNode;
  status: ProgressStatus;
  x: number;
  y: number;
  index: number;
  boss: boolean;
}

export interface LaidOutBanner {
  stage: LevelStage;
  y: number;
}

export interface AdventureLayout {
  nodes: LaidOutNode[];
  banners: LaidOutBanner[];
  insertSlots: InsertSlot[];
  height: number;
  centerX: number;
}

export function layoutAdventure(
  stages: LevelStage[],
  progressOf: (nodeId: string) => ProgressDoc | undefined,
): AdventureLayout {
  const centerX = PATH_WIDTH / 2;
  const nodes: LaidOutNode[] = [];
  const banners: LaidOutBanner[] = [];
  let y = TOP_PAD;
  let index = 0;

  const orderedStages = [...stages].sort((a, b) => a.order - b.order);
  for (const stage of orderedStages) {
    banners.push({ stage, y: y + 28 });
    y += BANNER_BLOCK;
    const orderedNodes = [...stage.nodes].sort((a, b) => a.order - b.order);
    for (const node of orderedNodes) {
      nodes.push({
        node,
        status: progressOf(node.id)?.status ?? "locked",
        x: centerX + snakeOffset(index),
        y,
        index,
        boss: isBossLike(node.nodeType),
      });
      y += NODE_SPACING;
      index += 1;
    }
    y += 8;
  }

  const insertSlots: InsertSlot[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const current = nodes[i];
    const following = nodes[i + 1];
    const yMid = following ? (current.y + following.y) / 2 : current.y + NODE_SPACING / 2;
    const xMid = following ? (current.x + following.x) / 2 : current.x;
    insertSlots.push({
      afterNodeId: current.node.id,
      x: Math.min(PATH_WIDTH - 28, xMid + 52),
      y: yMid,
    });
  }

  return { nodes, banners, insertSlots, height: y + BOTTOM_PAD, centerX };
}

export interface InsertSlot {
  afterNodeId: string;
  x: number;
  y: number;
}

function curve(a: LaidOutNode, b: LaidOutNode): string {
  const cy = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${cy}, ${b.x} ${cy}, ${b.x} ${b.y}`;
}

export function trailPath(nodes: LaidOutNode[]): string {
  if (nodes.length < 2) return "";
  return nodes
    .slice(0, -1)
    .map((node, i) => curve(node, nodes[i + 1]))
    .join(" ");
}

export function completedTrailPath(nodes: LaidOutNode[]): string {
  const parts: string[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    if (nodes[i].status !== "done") continue;
    parts.push(curve(nodes[i], nodes[i + 1]));
  }
  return parts.join(" ");
}
