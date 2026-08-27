"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, UserCheck, UserX, Trash2, Building2 } from "lucide-react";
import { Card, Spinner, ErrorNote, Badge, Button, Input } from "@/components/ui";
import { UserLimitsDrawer } from "@/components/UserLimitsDrawer";
import { getUsers, updateUserRole, updateUserApproval, deleteUser, type AdminUserRecord } from "@/lib/api";

export function UsersPanel() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AdminUserRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

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

  // Role: move between `user` and `internal_user` (internal users are exempt from
  // usage caps). Admin rows have no toggle — admin changes stay out of the dashboard,
  // which also means an admin can never toggle/suspend/delete their own row.
  const setRole = async (u: AdminUserRecord, role: string) => {
    setBusyId(u._id);
    setActionError("");
    try {
      await updateUserRole(u._id, role);
      setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, role } : x)));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to update role");
    } finally {
      setBusyId(null);
    }
  };

  const setApproval = async (u: AdminUserRecord, isApproved: boolean) => {
    setBusyId(u._id);
    setActionError("");
    try {
      await updateUserApproval(u._id, isApproved);
      setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, isApproved } : x)));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to update access");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (u: AdminUserRecord) => {
    if (!window.confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    setBusyId(u._id);
    setActionError("");
    try {
      await deleteUser(u._id);
      setUsers((prev) => prev.filter((x) => x._id !== u._id));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Spinner label="Loading users…" />;
  if (error) return <ErrorNote message={error} />;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input className="pl-9" placeholder="Search by email or name…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {actionError && <ErrorNote message={actionError} />}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Access</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const busy = busyId === u._id;
                const meta = [
                  u.organization,
                  (u.roles ?? []).join(", "),
                  u.interests?.length ? `${u.interests.length} interest${u.interests.length === 1 ? "" : "s"}` : "",
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <tr key={u._id} className="border-b border-gray-100 last:border-0 dark:border-gray-700/60">
                    <td className="px-5 py-3">
                      <div className="font-medium">{u.email}</div>
                      {u.name && <div className="text-xs text-gray-400">{u.name}</div>}
                      {meta && (
                        <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-gray-400">
                          <Building2 className="h-3 w-3 shrink-0" /> {meta}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {u.role === "admin" ? (
                          <Badge tone="navy">admin</Badge>
                        ) : u.role === "internal_user" ? (
                          <Badge tone="green">internal</Badge>
                        ) : (
                          <Badge>user</Badge>
                        )}
                        {u.role !== "admin" && (
                          <Button
                            variant="outline"
                            disabled={busy}
                            onClick={() => setRole(u, u.role === "internal_user" ? "user" : "internal_user")}
                          >
                            {busy ? "…" : u.role === "internal_user" ? "Revert to user" : "Make internal"}
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {u.isApproved ? <Badge tone="green">approved</Badge> : <Badge tone="amber">pending</Badge>}
                        {u.role !== "admin" &&
                          (u.isApproved ? (
                            <Button variant="ghost" disabled={busy} onClick={() => setApproval(u, false)} title="Suspend access">
                              <UserX className="h-3.5 w-3.5" /> Suspend
                            </Button>
                          ) : (
                            <Button variant="outline" disabled={busy} onClick={() => setApproval(u, true)} title="Approve access">
                              <UserCheck className="h-3.5 w-3.5" /> Approve
                            </Button>
                          ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" onClick={() => setSelected(u)}>
                          <SlidersHorizontal className="h-3.5 w-3.5" /> Limits
                        </Button>
                        {u.role !== "admin" && (
                          <Button variant="danger" disabled={busy} onClick={() => remove(u)} title="Delete user">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {selected && <UserLimitsDrawer userId={selected._id} userEmail={selected.email} onClose={() => setSelected(null)} />}
    </div>
  );
}
