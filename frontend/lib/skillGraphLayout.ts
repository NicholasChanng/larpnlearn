import dagre from "dagre";
import type { Edge, Node } from "reactflow";
import { Position } from "reactflow";

import type { SkillDagEdgeDto, SkillDagNode } from "./types";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Run Dagre over the backend DAG and emit React Flow nodes/edges.
 * `TB` direction puts foundational (level 0) skills at the top so the
 * graph grows downward toward advanced topics.
 */
export function layoutSkillGraph(
  backendNodes: SkillDagNode[],
  backendEdges: SkillDagEdgeDto[],
): LayoutResult {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    nodesep: 60,
    ranksep: 90,
    marginx: 24,
    marginy: 24,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of backendNodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of backendEdges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  }

  dagre.layout(g);

  const nodes: Node[] = backendNodes.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: "skill",
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
      },
      data: { node: n },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });

  const edges: Edge[] = backendEdges
    .filter((e) => g.hasNode(e.source) && g.hasNode(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: undefined,
      data: { rationale: e.rationale },
      animated: false,
      style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1.5 },
    }));

  return { nodes, edges };
}
