"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Card, Spinner, ErrorNote, Badge, Button, Input } from "@/components/ui";
import { UserLimitsDrawer } from "@/components/UserLimitsDrawer";
import { getUsers, type AdminUserRecord } from "@/lib/api";

export function UsersPanel() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AdminUserRecord | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setUsers(await getUsers());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => (u.email || "").toLowerCase().includes(s) || (u.name || "").toLowerCase().includes(s));
  }, [users, q]);

  if (loading) return <Spinner label="Loading users…" />;
  if (error) return <ErrorNote message={error} />;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input className="pl-9" placeholder="Search by email or name…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Limits</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id} className="border-b border-gray-100 last:border-0 dark:border-gray-700/60">
                  <td className="px-5 py-3">
                    <div className="font-medium">{u.email}</div>
                    {u.name && <div className="text-xs text-gray-400">{u.name}</div>}
                  </td>
                  <td className="px-5 py-3">
                    {u.role === "admin" ? <Badge tone="navy">admin</Badge> : <Badge>user</Badge>}
                  </td>
                  <td className="px-5 py-3">
                    {u.isApproved ? <Badge tone="green">approved</Badge> : <Badge tone="amber">pending</Badge>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="outline" onClick={() => setSelected(u)}>
                      <SlidersHorizontal className="h-3.5 w-3.5" /> Manage
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">
                    No users match “{q}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <UserLimitsDrawer userId={selected._id} userEmail={selected.email} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
