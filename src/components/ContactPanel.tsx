"use client";
import { useEffect, useState } from "react";
import { Building2, Mail, MailWarning } from "lucide-react";
import { Card, Badge, Spinner, ErrorNote } from "@/components/ui";
import { getContact, updateContact, type ContactEnquiry, type ContactStatus } from "@/lib/api";

const CONTACT_STATUSES: ContactStatus[] = ["new", "replied", "archived"];
const STATUS_TONE: Record<ContactStatus, "amber" | "green" | "gray"> = {
  new: "amber",
  replied: "green",
  archived: "gray",
};

export function ContactPanel() {
  const [items, setItems] = useState<ContactEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setItems(await getContact());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load enquiries");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const patch = (id: string, updated: ContactEnquiry) => setItems((prev) => prev.map((c) => (c._id === id ? updated : c)));

  const handleStatus = async (id: string, status: ContactStatus) => {
    setBusyId(id);
    try {
      patch(id, await updateContact(id, { status }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the enquiry");
    } finally {
      setBusyId(null);
    }
  };

  const handleNotes = async (id: string, adminNotes: string) => {
    try {
      patch(id, await updateContact(id, { adminNotes }));
    } catch {
      /* keep the typed note; a transient save failure shouldn't wipe it */
    }
  };

  if (loading) return <Spinner label="Loading enquiries…" />;
  if (error && items.length === 0) return <ErrorNote message={error} />;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} />}
      <Card className="overflow-hidden">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <li key={item._id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.name}</span>
                    {item.organisation && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Building2 className="h-3.5 w-3.5" /> {item.organisation}
                      </span>
                    )}
                    <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
                  </div>

                  {!item.emailed && (
                    <p className="mt-2 inline-flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                      <MailWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>Not delivered by email{item.emailError ? `: ${item.emailError}` : ""} — reply from here.</span>
                    </p>
                  )}

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">{item.message}</p>
                  <p className="mt-2 break-all text-xs text-slate-400">
                    {item.email} · {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <textarea
                    defaultValue={item.adminNotes ?? ""}
                    rows={1}
                    placeholder="Notes (saved when you click away)"
                    onBlur={(e) => {
                      if (e.target.value !== (item.adminNotes ?? "")) handleNotes(item._id, e.target.value);
                    }}
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-atria-green-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <a
                    href={`mailto:${item.email}?subject=${encodeURIComponent("Re: your message to SynBioAI")}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <Mail className="h-3.5 w-3.5" /> Reply
                  </a>
                  <select
                    value={item.status}
                    disabled={busyId === item._id}
                    onChange={(e) => handleStatus(item._id, e.target.value as ContactStatus)}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-atria-green-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  >
                    {CONTACT_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {items.length === 0 && <div className="py-16 text-center text-sm text-slate-400">No enquiries yet.</div>}
      </Card>
    </div>
  );
}
