"use client";

import { useEffect, useState } from "react";

import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import type { SkillsGraph } from "@/lib/types";

/**
 * Skills Graph View (SRS 4.1.3, FR-SKL-01..06).
 *
 * Owner: Track-3 (Frontend-Skills+Avatar). Replace the flat list with a
 * React Flow DAG layout, concept detail side panel, and "Visualize this"
 * modal that calls api.skills.visualize().
 */
const DEMO_COURSE_ID = "cs188-sp2024";

export default function SkillsPage() {
  const [graph, setGraph] = useState<SkillsGraph | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.skills.graph(DEMO_COURSE_ID).then((g) => {
      if (!cancelled) setGraph(g);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <TopBar />
      <section className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-6 text-3xl font-bold">Skills Graph</h1>
        {!graph && <p className="text-muted-foreground">Loading…</p>}
        {graph && (
          <div className="grid gap-3">
            {graph.skills.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-border bg-background/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.state}</div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                {s.prerequisites.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    requires: {s.prerequisites.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
