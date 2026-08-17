"use client";
import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Spinner, ErrorNote, Badge, Button } from "@/components/ui";
import { LimitEditor } from "@/components/LimitEditor";
import {
  getUserUsage,
  getLimits,
  setLimit,
  deleteLimit,
  type UserUsageRow,
  type Limit,
} from "@/lib/api";
import { cn } from "@/lib/cn";

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone = used >= limit ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-atria-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums text-xs text-gray-500 dark:text-gray-400">
        {used}/{limit}
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
  const [rows, setRows] = useState<UserUsageRow[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Limit>>({});
  const [period, setPeriod] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const [usage, limits] = await Promise.all([getUserUsage(userId), getLimits()]);
      setRows(usage.rows);
      setPeriod(usage.period);
      const map: Record<string, Limit> = {};
      for (const l of limits) if (l.scope === "user" && l.userId === userId) map[l.modelId] = l;
      setOverrides(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveOverride = async (modelId: string, v: number) => {
    setBusyKey(modelId);
    try {
      await setLimit({ scope: "user", userId, modelId, maxReqs: v });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusyKey(null);
    }
  };

  const resetOverride = async (modelId: string) => {
    setBusyKey(modelId);
    try {
      await deleteLimit({ scope: "user", userId, modelId });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-[var(--background)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold">{userEmail}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Per-model limits &amp; usage {period && <>· {period}</>}
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="py-2 font-medium">Model</th>
                  <th className="py-2 font-medium">Used this month</th>
                  <th className="py-2 font-medium">Limit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const ov = overrides[r.modelId];
                  return (
                    <tr key={r.modelId} className="border-b border-gray-100 last:border-0 dark:border-gray-700/60">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.displayName}</span>
                          {ov && <Badge tone="amber">override</Badge>}
                        </div>
                        <div className="font-mono text-xs text-gray-400">{r.modelId}</div>
                        {ov?.prevMaxReqs != null && (
                          <div className="text-xs text-gray-400">was {ov.prevMaxReqs}</div>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <UsageBar used={r.used} limit={r.limit} />
                      </td>
                      <td className="py-3">
                        <LimitEditor
                          value={r.limit}
                          onSave={(v) => saveOverride(r.modelId, v)}
                          onReset={() => resetOverride(r.modelId)}
                          canReset={!!ov}
                          busy={busyKey === r.modelId}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
