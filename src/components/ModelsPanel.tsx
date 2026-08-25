"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Globe } from "lucide-react";
import { Spinner, ErrorNote } from "@/components/ui";
import { LimitEditor } from "@/components/LimitEditor";
import { getModels, getLimits, setLimit, deleteLimit, type Model, type Limit } from "@/lib/api";
import { PHASES, WORKFLOWS, TASKS_BY_WORKFLOW, type CatalogTask } from "@/lib/catalog";
import { cn } from "@/lib/cn";

const GLOBAL_MODEL = "*";
const MUTED = "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400";

const wfKey = (id: string) => `wf:${id}`;
const taskKey = (wf: string, t: string) => `task:${wf}:${t}`;

function taskCountLabel(total: number, available: number, disabled: boolean): string {
  if (total === 0) return "No tasks yet";
  const p = total === 1 ? "" : "s";
  if (disabled) return `${total} task${p} planned`;
  if (available === total) return `${total} task${p}`;
  return `${available} of ${total} tasks available`;
}

/**
 * Model defaults arranged exactly like the app's /workflows page:
 * Phase → Workflow → Task → Model, as one tree (indentation + hairline rails,
 * chevron disclosure, no cards) — with a cap editor added on each cappable task
 * and model.
 */
export function ModelsPanel() {
  const [backendModels, setBackendModels] = useState<Model[]>([]);
  const [limits, setLimits] = useState<Limit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({ [wfKey(PHASES[0].workflowIds[0])]: true });

  const load = useCallback(async () => {
    try {
      setError("");
      const [m, l] = await Promise.all([getModels(), getLimits()]);
      setBackendModels(m);
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

  // Which tasks the backend can actually cap, and each task's models.
  const modelsByTask = useMemo(() => {
    const map: Record<string, { model: string; displayName: string }[]> = {};
    for (const m of backendModels) map[m.modelId] = m.models;
    return map;
  }, [backendModels]);
  const cappable = useMemo(() => new Set(backendModels.map((m) => m.modelId)), [backendModels]);

  const globalRow = limits.find((l) => l.scope === "global");
  const globalValue = globalRow?.maxReqs ?? 0;
  const taskDefault = (task: string) => limits.find((l) => l.scope === "default" && l.modelId === task && l.model === null);
  const modelDefault = (task: string, model: string) => limits.find((l) => l.scope === "default" && l.modelId === task && l.model === model);

  const allKeys = useMemo(() => {
    const keys: string[] = [];
    for (const phase of PHASES) {
      for (const wfId of phase.workflowIds) {
        const wf = WORKFLOWS[wfId];
        const tasks = TASKS_BY_WORKFLOW[wfId] ?? [];
        if (!wf || wf.disabled || tasks.length === 0) continue;
        keys.push(wfKey(wfId));
        for (const t of tasks) {
          if (!t.disabled && cappable.has(t.id) && (modelsByTask[t.id]?.length ?? 0) > 0) keys.push(taskKey(wfId, t.id));
        }
      }
    }
    return keys;
  }, [cappable, modelsByTask]);

  const expandAll = () => setOpen(Object.fromEntries(allKeys.map((k) => [k, true])));
  const collapseAll = () => setOpen({});
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));

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

  if (loading) return <Spinner label="Loading catalog…" />;

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
          <LimitEditor value={globalValue} onSave={(v) => run("global", () => setLimit({ scope: "global", modelId: GLOBAL_MODEL, maxReqs: v }))} busy={busyKey === "global"} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2 text-sm font-semibold">
        <button onClick={expandAll} className="text-atria-navy-700 underline-offset-4 hover:underline dark:text-atria-green-300">Expand all</button>
        <span className="text-slate-300 dark:text-slate-700" aria-hidden>/</span>
        <button onClick={collapseAll} className="text-slate-500 underline-offset-4 hover:underline dark:text-slate-400">Collapse all</button>
      </div>

      <div className="mt-4 space-y-12">
        {PHASES.map((phase) => (
          <section key={phase.title}>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{phase.title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{phase.subtitle}</p>

            <ul className="mt-4 border-t border-slate-200 dark:border-slate-800">
              {phase.workflowIds.map((wfId) => {
                const wf = WORKFLOWS[wfId];
                if (!wf) return null;
                const tasks = TASKS_BY_WORKFLOW[wfId] ?? [];
                const available = tasks.filter((t) => !t.disabled).length;
                const canOpen = !wf.disabled && tasks.length > 0;
                const isOpen = !!open[wfKey(wfId)];
                const WIcon = wf.Icon;
                return (
                  <li key={wfId} className="border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-start gap-3 py-4">
                      <button
                        onClick={() => canOpen && toggle(wfKey(wfId))}
                        className={cn("flex min-w-0 flex-1 items-start gap-3 text-left", canOpen ? "cursor-pointer" : "cursor-default")}
                      >
                        {canOpen ? (
                          <ChevronRight className={cn("mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200", isOpen && "rotate-90")} aria-hidden />
                        ) : (
                          <span className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                        )}
                        <WIcon className={cn("mt-0.5 h-5 w-5 shrink-0", wf.disabled ? "text-slate-400 dark:text-slate-500" : "text-atria-navy-600 dark:text-atria-green-400")} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                            <span className="font-semibold text-slate-900 dark:text-white">{wf.title}</span>
                            {wf.disabled && <span className={MUTED}>Coming soon</span>}
                          </span>
                          <span className="mt-0.5 block max-w-2xl text-sm text-slate-600 dark:text-slate-400">{wf.description}</span>
                        </span>
                      </button>
                      <span className="ml-auto hidden shrink-0 pt-1 text-xs font-medium text-slate-500 dark:text-slate-400 sm:block">
                        {taskCountLabel(tasks.length, available, !!wf.disabled)}
                      </span>
                    </div>

                    {isOpen && canOpen && (
                      <ul className="mb-2 ml-2 divide-y divide-slate-100 border-l border-slate-200 pl-4 dark:divide-slate-800/70 dark:border-slate-800 sm:pl-6">
                        {tasks.map((task) => (
                          <li key={task.id}>
                            <TaskRow
                              wfId={wfId}
                              task={task}
                              editable={!task.disabled && cappable.has(task.id)}
                              models={modelsByTask[task.id] ?? []}
                              effTask={taskDefault(task.id)?.maxReqs ?? globalValue}
                              hasTaskDefault={!!taskDefault(task.id)}
                              modelDefault={modelDefault}
                              open={open}
                              toggle={toggle}
                              busyKey={busyKey}
                              run={run}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function TaskRow({
  wfId, task, editable, models, effTask, hasTaskDefault, modelDefault, open, toggle, busyKey, run,
}: {
  wfId: string;
  task: CatalogTask;
  editable: boolean;
  models: { model: string; displayName: string }[];
  effTask: number;
  hasTaskDefault: boolean;
  modelDefault: (task: string, model: string) => Limit | undefined;
  open: Record<string, boolean>;
  toggle: (k: string) => void;
  busyKey: string | null;
  run: (key: string, fn: () => Promise<unknown>) => Promise<void>;
}) {
  const key = taskKey(wfId, task.id);
  const isOpen = !!open[key];
  const hasModels = editable && models.length > 0;
  const TIcon = task.Icon;

  return (
    <>
      <div className="flex items-start gap-2.5 py-3">
        <button
          onClick={() => hasModels && toggle(key)}
          className={cn("flex min-w-0 flex-1 items-start gap-2.5 text-left", hasModels ? "cursor-pointer" : "cursor-default")}
        >
          {hasModels ? (
            <ChevronRight className={cn("mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200", isOpen && "rotate-90")} aria-hidden />
          ) : (
            <span className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          )}
          <TIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{task.title}</span>
              {task.disabled && <span className={MUTED}>Coming soon</span>}
            </span>
            <span className="mt-0.5 block max-w-2xl text-sm text-slate-600 dark:text-slate-400">{task.desc}</span>
          </span>
        </button>
        {editable ? (
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {hasModels && <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline">{models.length} model{models.length === 1 ? "" : "s"}</span>}
            <LimitEditor
              value={effTask}
              onSave={(v) => run(task.id, () => setLimit({ scope: "default", modelId: task.id, maxReqs: v }))}
              onReset={() => run(task.id, () => deleteLimit({ scope: "default", modelId: task.id }))}
              canReset={hasTaskDefault}
              busy={busyKey === task.id}
            />
          </div>
        ) : (
          !task.disabled && <span className="shrink-0 pt-1 text-xs text-slate-400">not cappable</span>
        )}
      </div>

      {isOpen && hasModels && (
        <ul className="mb-2 ml-[26px] space-y-2 pb-1">
          {models.map((mo) => {
            const mk = `${task.id}::${mo.model}`;
            const md = modelDefault(task.id, mo.model);
            return (
              <li key={mo.model} className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    <span className="text-sm text-slate-900 dark:text-white">{mo.displayName}</span>
                    <span className="font-mono text-xs text-slate-400">{mo.model}</span>
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {md ? `model cap ${md.maxReqs}` : "no model cap — task cap applies"}
                  </span>
                </span>
                <LimitEditor
                  value={md?.maxReqs ?? effTask}
                  onSave={(v) => run(mk, () => setLimit({ scope: "default", modelId: task.id, model: mo.model, maxReqs: v }))}
                  onReset={() => run(mk, () => deleteLimit({ scope: "default", modelId: task.id, model: mo.model }))}
                  canReset={!!md}
                  busy={busyKey === mk}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
