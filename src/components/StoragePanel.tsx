"use client";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, Spinner, ErrorNote } from "@/components/ui";
import { getStorageOverview, type AdminStorageOverview } from "@/lib/api";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

const TH = "px-5 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-400";

export function StoragePanel() {
  const [data, setData] = useState<AdminStorageOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setData(await getStorageOverview());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load storage overview");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner label="Loading storage…" />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return null;

  const byKind = Object.entries(data.byKind).sort((a, b) => b[1].bytes - a[1].bytes);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Total stored" value={formatBytes(data.platform.totalBytes)} />
        <Stat label="Files" value={data.platform.fileCount.toLocaleString()} />
        <Stat label="Users with files" value={String(data.platform.usersWithFiles)} />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Warning threshold:{" "}
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {formatBytes(data.warningBytesThreshold)}
        </span>
        . Rows marked “Over” exceed it for that account.
      </p>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            By file kind (all users)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className={TH}>Kind</th>
                <th className={`${TH} text-right`}>Files</th>
                <th className={`${TH} text-right`}>Size</th>
              </tr>
            </thead>
            <tbody>
              {byKind.map(([kind, row]) => (
                <tr key={kind} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                  <td className="px-5 py-2 font-medium text-slate-800 dark:text-slate-200">{kind}</td>
                  <td className="px-5 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {row.count.toLocaleString()}
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums text-slate-900 dark:text-slate-100">
                    {formatBytes(row.bytes)}
                  </td>
                </tr>
              ))}
              {byKind.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-slate-400">
                    No files recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Per user</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className={TH}>User</th>
                <th className={`${TH} text-right`}>Files</th>
                <th className={`${TH} text-right`}>Size</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.byUser.map((row) => (
                <tr key={row.userId} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                  <td className="px-5 py-2">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{row.name || "—"}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.email || row.userId}</div>
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {row.fileCount.toLocaleString()}
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums font-medium text-slate-900 dark:text-slate-100">
                    {formatBytes(row.totalBytes)}
                  </td>
                  <td className="px-5 py-2">
                    {row.overWarning ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                        <AlertTriangle className="h-3 w-3" /> Over
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">OK</span>
                    )}
                  </td>
                </tr>
              ))}
              {data.byUser.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                    No user-attributed files.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
