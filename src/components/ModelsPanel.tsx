"use client";
import { useCallback, useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { Card, Spinner, ErrorNote, Badge } from "@/components/ui";
import { LimitEditor } from "@/components/LimitEditor";
import { getModels, getLimits, setLimit, deleteLimit, type Model, type Limit } from "@/lib/api";

const GLOBAL_MODEL = "*";

export function ModelsPanel() {
  const [models, setModels] = useState<Model[]>([]);
  const [limits, setLimits] = useState<Limit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

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
  const defaultFor = (modelId: string) => limits.find((l) => l.scope === "default" && l.modelId === modelId);

  const saveGlobal = async (v: number) => {
    setBusyKey("global");
    try {
      await setLimit({ scope: "global", modelId: GLOBAL_MODEL, maxReqs: v });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusyKey(null);
    }
  };

  const saveDefault = async (modelId: string, v: number) => {
    setBusyKey(modelId);
    try {
      await setLimit({ scope: "default", modelId, maxReqs: v });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusyKey(null);
    }
  };

  const resetDefault = async (modelId: string) => {
    setBusyKey(modelId);
    try {
      await deleteLimit({ scope: "default", modelId });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
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
          <Badge tone="navy">applies to every model with no default</Badge>
        </div>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          The safety cap. Any model without its own default falls back to this — so nothing ever runs uncapped.
        </p>
        <div className="flex items-center gap-3">
          <LimitEditor value={globalValue} onSave={saveGlobal} busy={busyKey === "global"} />
          <span className="text-sm text-gray-500 dark:text-gray-400">requests / user / month</span>
          {globalRow?.prevMaxReqs != null && (
            <span className="text-xs text-gray-400">was {globalRow.prevMaxReqs}</span>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-gray-200 p-5 dark:border-gray-700">
          <h3 className="font-semibold">Per-model defaults</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Set a default cap for a specific model — it applies to <span className="font-medium">all users</span> for
            that model. Leave unset to use the global floor. Per-user overrides (in the Users tab) beat these.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="px-5 py-3 font-medium">Model</th>
                <th className="px-5 py-3 font-medium">Effective default</th>
                <th className="px-5 py-3 font-medium">Set / override</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => {
                const d = defaultFor(m.modelId);
                const effective = d?.maxReqs ?? globalValue;
                return (
                  <tr key={m.modelId} className="border-b border-gray-100 last:border-0 dark:border-gray-700/60">
                    <td className="px-5 py-3">
                      <div className="font-medium">{m.displayName}</div>
                      <div className="font-mono text-xs text-gray-400">{m.modelId}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-semibold">{effective}</span>{" "}
                      {d ? (
                        <Badge tone="green">default</Badge>
                      ) : (
                        <span className="text-xs text-gray-400">(global)</span>
                      )}
                      {d?.prevMaxReqs != null && <span className="ml-2 text-xs text-gray-400">was {d.prevMaxReqs}</span>}
                    </td>
                    <td className="px-5 py-3">
                      <LimitEditor
                        value={effective}
                        onSave={(v) => saveDefault(m.modelId, v)}
                        onReset={() => resetDefault(m.modelId)}
                        canReset={!!d}
                        busy={busyKey === m.modelId}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
