"use client";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, Spinner, ErrorNote, Badge, Button } from "@/components/ui";
import { getUsage, type UsageRow } from "@/lib/api";

function statusBadge(used: number, limit: number | null) {
  if (limit == null) return <Badge tone="gray">no cap</Badge>;
  if (used >= limit) return <Badge tone="red">over</Badge>;
  if (limit > 0 && used / limit >= 0.8) return <Badge tone="amber">near</Badge>;
  return <Badge tone="green">ok</Badge>;
}

export function UsagePanel() {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [period, setPeriod] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setError("");
      const data = await getUsage();
      setRows(data.rows);
      setPeriod(data.period);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load usage");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Consumption for {period && <span className="font-medium">{period}</span>} — one row per user × task × model.
          Rows with no model are the task total. Usage is read-only; adjust caps in the other tabs.
        </p>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {loading ? (
        <Spinner label="Loading usage…" />
      ) : error ? (
        <ErrorNote message={error} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Task</th>
                  <th className="px-5 py-3 font-medium">Model</th>
                  <th className="px-5 py-3 font-medium">Used / Limit</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${r.userId}-${r.modelId}-${r.model ?? "task"}-${i}`}
                    className="border-b border-gray-100 last:border-0 dark:border-gray-700/60"
                  >
                    <td className="px-5 py-3">{r.email || <span className="font-mono text-xs">{r.userId}</span>}</td>
                    <td className="px-5 py-3 font-mono text-xs">{r.modelId}</td>
                    <td className="px-5 py-3">
                      {r.model ? (
                        <span className="font-mono text-xs">{r.model}</span>
                      ) : (
                        <span className="text-xs text-gray-400">task total</span>
                      )}
                    </td>
                    <td className="px-5 py-3 tabular-nums">
                      {r.used} / {r.limit ?? "—"}
                    </td>
                    <td className="px-5 py-3">{statusBadge(r.used, r.limit)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                      No usage recorded this month yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
