"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";
import type {
  SkillDagNode,
  SkillInsightResponse,
} from "@/lib/types";

import { MermaidDiagram } from "./MermaidDiagram";

type InsightEntry =
  | { status: "loading" }
  | { status: "ready"; data: SkillInsightResponse }
  | { status: "error"; message: string };

interface SkillDetailPanelProps {
  node: SkillDagNode;
  entry: InsightEntry | undefined;
  onClose: () => void;
  onRetry: () => void;
}

const STATUS_LABEL: Record<SkillDagNode["status"], string> = {
  locked: "Locked",
  attempted: "Attempted",
  mastered: "Mastered",
};

export function SkillDetailPanel({
  node,
  entry,
  onClose,
  onRetry,
}: SkillDetailPanelProps) {
  const [mermaidOpen, setMermaidOpen] = useState(false);
  const insight = entry?.status === "ready" ? entry.data : null;
  const hasViz =
    insight?.visualization?.type === "mermaid" && insight.visualization.content;

  return (
    <aside className="flex w-full flex-col border-l border-border bg-background/95 backdrop-blur">
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            L{node.level} · {STATUS_LABEL[node.status]}
          </div>
          <h2 className="mt-1 truncate text-lg font-semibold">{node.label}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
          <X size={16} />
        </Button>
      </header>

      <div className="space-y-5 px-5 py-4 text-sm">
        {!entry || entry.status === "loading" ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Spinner size={14} />
            Loading insight…
          </p>
        ) : entry.status === "error" ? (
          <div className="space-y-2">
            <p className="text-destructive">Couldn't load insight.</p>
            <p className="text-xs text-muted-foreground">{entry.message}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : (
          insight && (
            <>
              {insight.summary.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Summary
                  </h3>
                  <ul className="list-disc space-y-1 pl-5">
                    {insight.summary.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </section>
              )}

              {insight.pseudocode && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Pseudocode
                  </h3>
                  <pre className="overflow-x-auto rounded bg-muted p-3 text-xs leading-relaxed">
                    {insight.pseudocode}
                  </pre>
                </section>
              )}

              {insight.addons.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    More
                  </h3>
                  {insight.addons.map((addon, i) => (
                    <div
                      key={i}
                      className="rounded border border-border bg-background/60 p-3"
                    >
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {addon.type}
                      </div>
                      <div className="mt-0.5 font-medium">{addon.title}</div>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {addon.content}
                      </p>
                    </div>
                  ))}
                </section>
              )}

              {node.lecture_refs.length > 0 && (
                <section>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Lectures
                  </h3>
                  <p className="text-muted-foreground">
                    {node.lecture_refs.join(", ")}
                  </p>
                </section>
              )}
            </>
          )
        )}
      </div>

      <footer className="border-t border-border px-5 py-3">
        <Button
          className="w-full"
          disabled={!hasViz}
          onClick={() => setMermaidOpen(true)}
        >
          {hasViz ? "Visualize this" : "No visualization"}
        </Button>
      </footer>

      {mermaidOpen && hasViz && insight?.visualization && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setMermaidOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg border border-border bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{node.label}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMermaidOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </Button>
            </div>
            <MermaidDiagram code={insight.visualization.content} />
          </div>
        </div>
      )}
    </aside>
  );
}
