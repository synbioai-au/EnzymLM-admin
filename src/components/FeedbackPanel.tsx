"use client";
import { useEffect, useState } from "react";
import { Bug, Lightbulb, MessageSquare, Github, ExternalLink, RefreshCw, Loader2, Camera, Terminal, Eye } from "lucide-react";
import { Card, Badge, Button, Spinner, ErrorNote } from "@/components/ui";
import FeedbackDetailModal from "@/components/FeedbackDetailModal";
import {
  getFeedback,
  updateFeedback,
  getFeedbackGithubStatus,
  retryFeedbackGithub,
  type Feedback,
  type FeedbackStatus,
} from "@/lib/api";

const FEEDBACK_STATUSES: FeedbackStatus[] = ["open", "in_progress", "resolved", "closed"];

const TYPE_META: Record<Feedback["type"], { label: string; icon: typeof Bug; cls: string }> = {
  bug: { label: "Bug", icon: Bug, cls: "text-red-600 dark:text-red-400" },
  feature: { label: "Feature", icon: Lightbulb, cls: "text-amber-500 dark:text-amber-400" },
  general: { label: "Feedback", icon: MessageSquare, cls: "text-atria-green-700 dark:text-atria-green-300" },
};

const STATUS_TONE: Record<FeedbackStatus, "amber" | "navy" | "green" | "gray"> = {
  open: "amber",
  in_progress: "navy",
  resolved: "green",
  closed: "gray",
};

export function FeedbackPanel() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [github, setGithub] = useState<{ configured: boolean; repo: string | null } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const selected = feedback.find((f) => f._id === selectedId) ?? null;

  useEffect(() => {
    (async () => {
      try {
        const [reports, gh] = await Promise.all([getFeedback(), getFeedbackGithubStatus().catch(() => null)]);
        setFeedback(reports);
        setGithub(gh);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load reports");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const patch = (id: string, updated: Feedback) => setFeedback((prev) => prev.map((f) => (f._id === id ? updated : f)));

  const handleStatus = async (id: string, status: FeedbackStatus) => {
    setActionId(id);
    try {
      patch(id, await updateFeedback(id, { status }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update status");
    } finally {
      setActionId(null);
    }
  };

  const handleSaveNotes = async (id: string, adminNotes: string) => {
    patch(id, await updateFeedback(id, { adminNotes }));
  };

  const handleRetryGithub = async (id: string) => {
    setActionId(`gh-${id}`);
    try {
      patch(id, await retryFeedbackGithub(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not file the GitHub issue");
    } finally {
      setActionId(null);
    }
  };

  if (loading) return <Spinner label="Loading reports…" />;
  if (error && feedback.length === 0) return <ErrorNote message={error} />;

  return (
    <div className="space-y-4">
      <p className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Github className="h-3.5 w-3.5" />
        {github?.configured ? (
          <>
            Filing issues to <span className="font-medium text-slate-700 dark:text-slate-300">{github.repo}</span>
          </>
        ) : (
          <span>GitHub Issues integration is off.</span>
        )}
      </p>

      {error && <ErrorNote message={error} />}

      <Card className="overflow-hidden">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {feedback.map((item) => {
            const meta = TYPE_META[item.type] ?? TYPE_META.general;
            const TypeIcon = meta.icon;
            return (
              <li key={item._id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${meta.cls}`}>
                        <TypeIcon className="h-3.5 w-3.5" /> {meta.label}
                      </span>
                      {item.type === "bug" && item.severity && (
                        <span className="text-[11px] font-bold uppercase text-slate-400">{item.severity}</span>
                      )}
                      <Badge tone={STATUS_TONE[item.status]}>{item.status.replace("_", " ")}</Badge>
                      {item.context?.hasScreenshot && <Camera className="h-3 w-3 text-slate-400" />}
                      {item.context?.hasConsoleLogs && <Terminal className="h-3 w-3 text-slate-400" />}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item._id)}
                      className="mt-1 block text-left text-sm font-semibold text-slate-900 hover:underline dark:text-slate-100"
                    >
                      {item.title}
                    </button>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {item.userName || "Unknown"}
                      {item.userEmail ? ` · ${item.userEmail}` : ""} · {new Date(item.createdAt).toLocaleString()}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      {item.githubIssueUrl ? (
                        <a
                          href={item.githubIssueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-atria-green-700 hover:underline dark:text-atria-green-300"
                        >
                          <Github className="h-3.5 w-3.5" /> Issue #{item.githubIssueNumber}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : item.githubSyncStatus === "failed" ? (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                          <Github className="h-3.5 w-3.5" /> GitHub sync failed
                        </span>
                      ) : null}
                      {github?.configured && !item.githubIssueUrl && (
                        <button
                          type="button"
                          disabled={actionId === `gh-${item._id}`}
                          onClick={() => handleRetryGithub(item._id)}
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          {actionId === `gh-${item._id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          {item.githubSyncStatus === "failed" ? "Retry" : "File issue"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Button variant="outline" onClick={() => setSelectedId(item._id)}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                    <select
                      value={item.status}
                      disabled={actionId === item._id}
                      onChange={(e) => handleStatus(item._id, e.target.value as FeedbackStatus)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-atria-green-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    >
                      {FEEDBACK_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {feedback.length === 0 && <div className="py-16 text-center text-sm text-slate-400">No reports yet.</div>}
      </Card>

      <FeedbackDetailModal
        report={selected}
        githubConfigured={!!github?.configured}
        busy={actionId === selectedId || actionId === `gh-${selectedId}`}
        onClose={() => setSelectedId(null)}
        onStatusChange={handleStatus}
        onSaveNotes={handleSaveNotes}
        onRetryGithub={handleRetryGithub}
      />
    </div>
  );
}
