"use client";
import { useCallback, useEffect, useState } from "react";
import { X, ChevronRight, ChevronDown, Layers } from "lucide-react";
import { Spinner, ErrorNote, Badge, Button } from "@/components/ui";
import { LimitEditor } from "@/components/LimitEditor";
import { getUserUsage, getLimits, setLimit, deleteLimit, type TaskUsage, type Limit } from "@/lib/api";
import { cn } from "@/lib/cn";

function UsageBar({ used, limit }: { used: number; limit: number | null }) {
  const cap = limit ?? 0;
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  const tone = limit != null && used >= limit ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-atria-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums text-xs text-gray-500 dark:text-gray-400">
        {used}/{limit ?? "—"}
      </span>
    </div>
  );
}

export function UserLimitsDrawer({
  userId,
  userEmail,
  onClose,
}: {
  userId: string;
  userEmail: string;
  onClose: () => void;
}) {
  const [tasks, setTasks] = useState<TaskUsage[]>([]);
  const [limits, setLimits] = useState<Limit[]>([]);
  const [period, setPeriod] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      setError("");
      const [usage, allLimits] = await Promise.all([getUserUsage(userId), getLimits()]);
      setTasks(usage.tasks);
      setPeriod(usage.period);
      setLimits(allLimits.filter((l) => l.scope === "user" && l.userId === userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const taskOverride = (task: string) => limits.find((l) => l.modelId === task && l.model === null);
  const modelOverride = (task: string, model: string) => limits.find((l) => l.modelId === task && l.model === model);

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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-3xl flex-col bg-[var(--background)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold">{userEmail}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Per-task &amp; per-model limits {period && <>· {period}</>}
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" /> Close
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <Spinner label="Loading user usage…" />
          ) : error ? (
            <ErrorNote message={error} />
          ) : (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-700/60 dark:border-gray-700">
              {tasks.map((t) => {
                const to = taskOverride(t.modelId);
                const isOpen = !!open[t.modelId];
                const hasModels = t.models.length > 0;
                return (
                  <div key={t.modelId}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => hasModels && setOpen((o) => ({ ...o, [t.modelId]: !o[t.modelId] }))}
                        className={cn("flex min-w-0 flex-1 items-center gap-2 text-left", hasModels ? "cursor-pointer" : "cursor-default")}
                      >
                        {hasModels ? (
                          isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}
                        <span className="min-w-0">
                          <span className="font-medium">{t.displayName}</span>
                          {to && <Badge tone="amber">override</Badge>}
                          {hasModels && (
                            <Badge tone="gray">
                              <Layers className="mr-1 h-3 w-3" />
                              {t.models.length}
                            </Badge>
                          )}
                          <span className="ml-2 block font-mono text-xs text-gray-400">{t.modelId}</span>
                        </span>
                      </button>
                      <div className="w-28 shrink-0">
                        <UsageBar used={t.used} limit={t.limit} />
                      </div>
                      <LimitEditor
                        value={t.limit}
                        onSave={(v) => run(t.modelId, () => setLimit({ scope: "user", userId, modelId: t.modelId, maxReqs: v }))}
                        onReset={() => run(t.modelId, () => deleteLimit({ scope: "user", userId, modelId: t.modelId }))}
                        canReset={!!to}
                        busy={busyKey === t.modelId}
                      />
                    </div>

                    {isOpen && hasModels && (
                      <div className="bg-gray-50/60 px-4 pb-3 dark:bg-gray-900/30">
                        {t.models.map((mo) => {
                          const mk = `${t.modelId}::${mo.model}`;
                          const mov = modelOverride(t.modelId, mo.model);
                          const val = mo.limit ?? t.limit;
                          return (
                            <div key={mo.model} className="flex items-center gap-3 py-2 pl-6">
                              <span className="min-w-0 flex-1">
                                <span className="text-sm">{mo.displayName}</span>
                                {mov && <Badge tone="amber">override</Badge>}
                                <span className="ml-2 font-mono text-xs text-gray-400">{mo.model}</span>
                              </span>
                              <div className="w-28 shrink-0">
                                <UsageBar used={mo.used} limit={mo.limit} />
                              </div>
                              <LimitEditor
                                value={val}
                                onSave={(v) =>
                                  run(mk, () => setLimit({ scope: "user", userId, modelId: t.modelId, model: mo.model, maxReqs: v }))
                                }
                                onReset={() => run(mk, () => deleteLimit({ scope: "user", userId, modelId: t.modelId, model: mo.model }))}
                                canReset={!!mov}
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
          )}
        </div>
      </div>
    </div>
  );
}
