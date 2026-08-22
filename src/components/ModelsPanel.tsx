"use client";
import { useCallback, useEffect, useState } from "react";
import { Globe, ChevronRight, ChevronDown, Layers } from "lucide-react";
import { Card, Spinner, ErrorNote, Badge } from "@/components/ui";
import { LimitEditor } from "@/components/LimitEditor";
import { getModels, getLimits, setLimit, deleteLimit, type Model, type Limit } from "@/lib/api";
import { cn } from "@/lib/cn";

const GLOBAL_MODEL = "*";

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
  const taskDefault = (task: string) =>
    limits.find((l) => l.scope === "default" && l.modelId === task && l.model === null);
  const modelDefault = (task: string, model: string) =>
    limits.find((l) => l.scope === "default" && l.modelId === task && l.model === model);

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
    <div className="space-y-5">
      {error && <ErrorNote message={error} />}

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-atria-navy-600 dark:text-atria-green-400" />
          <h3 className="font-semibold">Global floor</h3>
          <Badge tone="navy">applies to every task with no default</Badge>
        </div>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          The safety cap. Any task without its own default falls back to this — so nothing ever runs uncapped.
        </p>
        <div className="flex items-center gap-3">
          <LimitEditor
            value={globalValue}
            onSave={(v) => run("global", () => setLimit({ scope: "global", modelId: GLOBAL_MODEL, maxReqs: v }))}
            busy={busyKey === "global"}
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">requests / user / month</span>
          {globalRow?.prevMaxReqs != null && <span className="text-xs text-gray-400">was {globalRow.prevMaxReqs}</span>}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-gray-200 p-5 dark:border-gray-700">
          <h3 className="font-semibold">Per-task &amp; per-model defaults</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Set a default cap for a task (applies to all its models), then expand a task to cap individual models — e.g.
            allow 100 VespaG but only 5 ESM-2. Per-user overrides (Users tab) beat these. A run must pass both its task
            cap and its model cap.
          </p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {models.map((m) => {
            const td = taskDefault(m.modelId);
            const effTask = td?.maxReqs ?? globalValue;
            const isOpen = !!open[m.modelId];
            const hasModels = m.models.length > 0;
            return (
              <div key={m.modelId}>
                <div className="flex items-center gap-3 px-5 py-3">
                  <button
                    onClick={() => hasModels && setOpen((o) => ({ ...o, [m.modelId]: !o[m.modelId] }))}
                    className={cn("flex min-w-0 flex-1 items-center gap-2 text-left", hasModels ? "cursor-pointer" : "cursor-default")}
                  >
                    {hasModels ? (
                      isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                    <span className="min-w-0">
                      <span className="font-medium">{m.displayName}</span>
                      <span className="ml-2 font-mono text-xs text-gray-400">{m.modelId}</span>
                      {hasModels && (
                        <Badge tone="gray">
                          <Layers className="mr-1 h-3 w-3" />
                          {m.models.length} models
                        </Badge>
                      )}
                    </span>
                  </button>
                  <span className="shrink-0 text-sm">
                    <span className="font-semibold">{effTask}</span>{" "}
                    {td ? <Badge tone="green">default</Badge> : <span className="text-xs text-gray-400">(global)</span>}
                  </span>
                  <LimitEditor
                    value={effTask}
                    onSave={(v) => run(m.modelId, () => setLimit({ scope: "default", modelId: m.modelId, maxReqs: v }))}
                    onReset={() => run(m.modelId, () => deleteLimit({ scope: "default", modelId: m.modelId }))}
                    canReset={!!td}
                    busy={busyKey === m.modelId}
                  />
                </div>

                {isOpen && hasModels && (
                  <div className="bg-gray-50/60 px-5 pb-3 dark:bg-gray-900/30">
                    {m.models.map((mo) => {
                      const mk = `${m.modelId}::${mo.model}`;
                      const md = modelDefault(m.modelId, mo.model);
                      const val = md?.maxReqs ?? effTask;
                      return (
                        <div key={mo.model} className="flex items-center gap-3 py-2 pl-6">
                          <span className="min-w-0 flex-1">
                            <span className="text-sm">{mo.displayName}</span>
                            <span className="ml-2 font-mono text-xs text-gray-400">{mo.model}</span>
                          </span>
                          <span className="shrink-0 text-sm">
                            {md ? (
                              <>
                                <span className="font-semibold">{md.maxReqs}</span> <Badge tone="amber">model cap</Badge>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400">no model cap (task cap applies)</span>
                            )}
                          </span>
                          <LimitEditor
                            value={val}
                            onSave={(v) =>
                              run(mk, () => setLimit({ scope: "default", modelId: m.modelId, model: mo.model, maxReqs: v }))
                            }
                            onReset={() => run(mk, () => deleteLimit({ scope: "default", modelId: m.modelId, model: mo.model }))}
                            canReset={!!md}
                            busy={busyKey === mk}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
