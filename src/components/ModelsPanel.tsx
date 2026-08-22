"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Globe } from "lucide-react";
import { Spinner, ErrorNote } from "@/components/ui";
import { LimitEditor } from "@/components/LimitEditor";
import { getModels, getLimits, setLimit, deleteLimit, type Model, type Limit } from "@/lib/api";
import { cn } from "@/lib/cn";

const GLOBAL_MODEL = "*";

/** Model defaults as one tree — task → model — mirroring the app's /workflows page:
 *  indentation + hairline rails, chevron disclosure, no cards, text labels. */
export function ModelsPanel() {
  const [models, setModels] = useState<Model[]>([]);
  const [limits, setLimits] = useState<Limit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      setError("");
      const [m, l] = await Promise.all([getModels(), getLimits()]);
      setModels(m);
      setLimits(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const globalRow = limits.find((l) => l.scope === "global");
  const globalValue = globalRow?.maxReqs ?? 0;
  const taskDefault = (task: string) => limits.find((l) => l.scope === "default" && l.modelId === task && l.model === null);
  const modelDefault = (task: string, model: string) => limits.find((l) => l.scope === "default" && l.modelId === task && l.model === model);

  const withModels = useMemo(() => models.filter((m) => m.models.length > 0), [models]);
  const expandAll = () => setOpen(Object.fromEntries(withModels.map((m) => [m.modelId, true])));
  const collapseAll = () => setOpen({});

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusyKey(key);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) return <Spinner label="Loading models…" />;

  return (
    <div className="mx-auto max-w-4xl">
      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      {/* Global floor — a row, not a card. */}
      <div className="flex items-start gap-3 border-b border-slate-200 py-5 dark:border-slate-800">
        <Globe className="mt-0.5 h-5 w-5 shrink-0 text-atria-navy-600 dark:text-atria-green-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-900 dark:text-white">Global floor</div>
          <div className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
            The safety cap — any task without its own default falls back to this, so nothing runs uncapped.
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {globalRow?.prevMaxReqs != null && <span className="text-xs text-slate-400">was {globalRow.prevMaxReqs}</span>}
          <LimitEditor
            value={globalValue}
            onSave={(v) => run("global", () => setLimit({ scope: "global", modelId: GLOBAL_MODEL, maxReqs: v }))}
            busy={busyKey === "global"}
          />
        </div>
      </div>

      {/* Section header + expand/collapse (text buttons, not pills). */}
      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Per-task &amp; per-model defaults</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Set a task&rsquo;s cap (applies to all its models), then open a task to cap individual models — e.g. 100
            VespaG but 5 ESM-2. A run must pass both its task cap and its model cap.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm font-semibold">
          <button onClick={expandAll} className="text-atria-navy-700 underline-offset-4 hover:underline dark:text-atria-green-300">Expand all</button>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden>/</span>
          <button onClick={collapseAll} className="text-slate-500 underline-offset-4 hover:underline dark:text-slate-400">Collapse all</button>
        </div>
      </div>

      {/* The tree. */}
      <ul className="mt-5 border-t border-slate-200 dark:border-slate-800">
        {models.map((m) => {
          const td = taskDefault(m.modelId);
          const effTask = td?.maxReqs ?? globalValue;
          const isOpen = !!open[m.modelId];
          const hasModels = m.models.length > 0;
          return (
            <li key={m.modelId} className="border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-3 py-4">
                <button
                  onClick={() => hasModels && setOpen((o) => ({ ...o, [m.modelId]: !o[m.modelId] }))}
                  className={cn("flex min-w-0 flex-1 items-start gap-3 text-left", hasModels ? "cursor-pointer" : "cursor-default")}
                >
                  {hasModels ? (
                    <ChevronRight className={cn("mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500", isOpen && "rotate-90")} aria-hidden />
                  ) : (
                    <span className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                      <span className="font-semibold text-slate-900 dark:text-white">{m.displayName}</span>
                      <span className="font-mono text-xs text-slate-400">{m.modelId}</span>
                    </span>
                    {hasModels && (
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                        {m.models.length} model{m.models.length === 1 ? "" : "s"} · task cap {effTask}
                        {!td && " (from global)"}
                      </span>
                    )}
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-2 pt-0.5">
                  {td?.prevMaxReqs != null && <span className="text-xs text-slate-400">was {td.prevMaxReqs}</span>}
                  <LimitEditor
                    value={effTask}
                    onSave={(v) => run(m.modelId, () => setLimit({ scope: "default", modelId: m.modelId, maxReqs: v }))}
                    onReset={() => run(m.modelId, () => deleteLimit({ scope: "default", modelId: m.modelId }))}
                    canReset={!!td}
                    busy={busyKey === m.modelId}
                  />
                </div>
              </div>

              {/* Nested models — indentation + a hairline rail, no box. */}
              {isOpen && hasModels && (
                <ul className="mb-2 ml-2 divide-y divide-slate-100 border-l border-slate-200 pl-4 dark:divide-slate-800/70 dark:border-slate-800 sm:pl-6">
                  {m.models.map((mo) => {
                    const mk = `${m.modelId}::${mo.model}`;
                    const md = modelDefault(m.modelId, mo.model);
                    return (
                      <li key={mo.model} className="flex items-center gap-3 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{mo.displayName}</span>
                            <span className="font-mono text-xs text-slate-400">{mo.model}</span>
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                            {md ? `model cap ${md.maxReqs}` : "no model cap — task cap applies"}
                          </span>
                        </span>
                        <LimitEditor
                          value={md?.maxReqs ?? effTask}
                          onSave={(v) => run(mk, () => setLimit({ scope: "default", modelId: m.modelId, model: mo.model, maxReqs: v }))}
                          onReset={() => run(mk, () => deleteLimit({ scope: "default", modelId: m.modelId, model: mo.model }))}
                          canReset={!!md}
                          busy={busyKey === mk}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
