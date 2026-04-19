"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "reactflow";
import "reactflow/dist/style.css";

import { StatsWidget } from "@/components/layout/StatsWidget";
import { SkillDetailPanel } from "@/components/skills/SkillDetailPanel";
import { SkillNode } from "@/components/skills/SkillNode";
import { CloudLoadingOverlay } from "@/components/world/CloudLoadingOverlay";
import { api } from "@/lib/api";
import { layoutSkillGraph } from "@/lib/skillGraphLayout";
import {
  lectureIdFromOrderIndex,
  type SkillDagNode,
  type WorldResponse,
} from "@/lib/types";
import { useSkillGraphStore } from "@/store/useSkillGraphStore";

const WORLD_COURSE_ID = "cs188-sp2024";
const SKILL_GRAPH_COURSE_ID = "cs188";

const nodeTypes = { skill: SkillNode };

const PANEL_MIN_WIDTH = 280;
const PANEL_MAX_WIDTH = 900;
const PANEL_DEFAULT_WIDTH = 420;

export default function SkillsPage() {
  const [world, setWorld] = useState<WorldResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
  const resizingRef = useRef(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;

    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const next = window.innerWidth - ev.clientX;
      const clamped = Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, next));
      setPanelWidth(clamped);
    };
    const onUp = () => {
      resizingRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const { graph, status, error, insights, loadGraph, loadInsight } =
    useSkillGraphStore();

  const lectureIds = useMemo(
    () => (world ? world.levels.map((l) => lectureIdFromOrderIndex(l.order_index)) : []),
    [world],
  );
  const masteredLectureIds = useMemo(
    () =>
      world
        ? world.levels
            .filter((l) => l.state === "completed")
            .map((l) => lectureIdFromOrderIndex(l.order_index))
        : [],
    [world],
  );

  useEffect(() => {
    let cancelled = false;
    api.world
      .get(WORLD_COURSE_ID)
      .then((w) => {
        if (!cancelled) setWorld(w);
      })
      .catch(() => {
        if (!cancelled) setWorld({ course_id: WORLD_COURSE_ID, theme: "greek", levels: [], current_level_id: null, segments: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!world) return;
    loadGraph({
      courseId: SKILL_GRAPH_COURSE_ID,
      lectureIds,
      masteredLectureIds,
    });
  }, [world, lectureIds, masteredLectureIds, loadGraph]);

  const laidOut = useMemo(() => {
    if (!graph) return { nodes: [] as Node[], edges: [] as Edge[] };
    const masteredSet = new Set(masteredLectureIds);
    const decorated: SkillDagNode[] = graph.nodes.map((n) => {
      if (n.status === "mastered") return n;
      const touched = n.lecture_refs.some((ref) => masteredSet.has(ref));
      if (touched) return { ...n, status: "attempted" };
      return n;
    });
    return layoutSkillGraph(decorated, graph.edges);
  }, [graph, masteredLectureIds]);

  const selectedNode = useMemo(() => {
    if (!graph || !selectedId) return null;
    return graph.nodes.find((n) => n.id === selectedId) ?? null;
  }, [graph, selectedId]);

  const decoratedSelectedNode = useMemo(() => {
    if (!selectedNode) return null;
    const masteredSet = new Set(masteredLectureIds);
    if (selectedNode.status === "mastered") return selectedNode;
    const touched = selectedNode.lecture_refs.some((ref) => masteredSet.has(ref));
    return touched ? { ...selectedNode, status: "attempted" as const } : selectedNode;
  }, [selectedNode, masteredLectureIds]);

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    setSelectedId(node.id);
    loadInsight({
      skillId: node.id,
      courseId: SKILL_GRAPH_COURSE_ID,
      lectureIds,
    });
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <StatsWidget />
      <section className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-baseline justify-between px-6 py-4">
          <h1 className="text-2xl font-bold">Skills Graph</h1>
          {status === "ready" && graph && (
            <p className="text-xs text-muted-foreground">
              {graph.nodes.length} skills · {graph.edges.length} links
            </p>
          )}
        </div>

        <div className="relative flex flex-1 overflow-hidden border-t border-border">
          <div className="relative flex-1">
            {status === "error" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/80 px-6 text-center">
                <p className="text-sm text-destructive">
                  Couldn't load skill graph.
                </p>
                <p className="max-w-md text-xs text-muted-foreground">{error}</p>
                <button
                  className="mt-2 rounded border border-border px-3 py-1 text-xs hover:bg-accent"
                  onClick={() =>
                    loadGraph({
                      courseId: SKILL_GRAPH_COURSE_ID,
                      lectureIds,
                      masteredLectureIds,
                    })
                  }
                >
                  Retry
                </button>
              </div>
            )}
            <ReactFlow
              nodes={laidOut.nodes}
              edges={laidOut.edges}
              nodeTypes={nodeTypes}
              onNodeClick={handleNodeClick}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              proOptions={{ hideAttribution: true }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
            >
              <Background gap={24} />
              <MiniMap pannable zoomable className="!bg-background" />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>

          {decoratedSelectedNode && (
            <>
              <div
                role="separator"
                aria-orientation="vertical"
                onMouseDown={startResize}
                className="group relative w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/60"
                title="Drag to resize"
              >
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </div>
              <div
                className="h-full shrink-0"
                style={{ width: `${panelWidth}px` }}
              >
                <SkillDetailPanel
                  node={decoratedSelectedNode}
                  entry={insights[decoratedSelectedNode.id]}
                  onClose={() => setSelectedId(null)}
                  onRetry={() =>
                    loadInsight({
                      skillId: decoratedSelectedNode.id,
                      courseId: SKILL_GRAPH_COURSE_ID,
                      lectureIds,
                    })
                  }
                />
              </div>
            </>
          )}
        </div>
      </section>
      <CloudLoadingOverlay loading={status === "loading" || !world}>
        <div className="text-lg font-semibold text-slate-700">
          Building your skill graph…
        </div>
      </CloudLoadingOverlay>
    </main>
  );
}
