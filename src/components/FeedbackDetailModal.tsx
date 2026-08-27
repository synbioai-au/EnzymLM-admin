"use client";
import { useEffect, useState } from "react";
import { Bug, Lightbulb, MessageSquare, Github, ExternalLink, RefreshCw, Loader2, Camera, Terminal, X } from "lucide-react";
import { getFeedbackDetail, type Feedback, type FeedbackStatus } from "@/lib/api";
import { Button } from "@/components/ui";

const FEEDBACK_STATUSES: FeedbackStatus[] = ["open", "in_progress", "resolved", "closed"];

const TYPE_META: Record<Feedback["type"], { label: string; icon: typeof Bug; cls: string }> = {
  bug: { label: "Bug", icon: Bug, cls: "text-red-600 dark:text-red-400" },
  feature: { label: "Feature request", icon: Lightbulb, cls: "text-amber-500 dark:text-amber-400" },
  general: { label: "Feedback", icon: MessageSquare, cls: "text-atria-green-700 dark:text-atria-green-300" },
};

const LABEL = "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className={LABEL}>{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  );
}

function DiagItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</span>
      <span className="ml-1.5 break-all text-slate-700 dark:text-slate-300">{value}</span>
    </div>
  );
}

interface Props {
  report: Feedback | null;
  githubConfigured: boolean;
  busy: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: FeedbackStatus) => void;
  onSaveNotes: (id: string, notes: string) => Promise<void>;
  onRetryGithub: (id: string) => void;
}

export default function FeedbackDetailModal({
  report,
  githubConfigured,
  busy,
  onClose,
  onStatusChange,
  onSaveNotes,
  onRetryGithub,
}: Props) {
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [detail, setDetail] = useState<Feedback | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setNotes(report?.adminNotes ?? "");
  }, [report?._id, report?.adminNotes]);

  // The list payload omits screenshot + console logs; fetch the full report on open.
  useEffect(() => {
    const id = report?._id;
    if (!id) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetail(null);
    setLoadingDetail(true);
    getFeedbackDetail(id)
      .then((full) => {
        if (!cancelled) setDetail(full);
      })
      .catch(() => {
        /* non-fatal: the lightweight report still renders */
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [report?._id]);

  if (!report) return null;

  const ctx = detail?.context ?? report.context;
  const screenshot = detail?.context?.screenshot ?? null;
  const consoleLogs = detail?.context?.consoleLogs ?? null;
  const diag = ctx?.diagnostics ?? null;
  const hasScreenshot = report.context?.hasScreenshot ?? Boolean(screenshot);
  const hasLogs = report.context?.hasConsoleLogs ?? Boolean(consoleLogs?.length);

  const meta = TYPE_META[report.type] ?? TYPE_META.general;
  const TypeIcon = meta.icon;
  const notesDirty = notes !== (report.adminNotes ?? "");

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await onSaveNotes(report._id, notes);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm">
      <div className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-700">
          <div className="min-w-0">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${meta.cls}`}>
              <TypeIcon className="h-3.5 w-3.5" />
              {meta.label}
              {report.type === "bug" && report.severity ? ` · ${report.severity}` : ""}
            </span>
            <h3 className="mt-1 break-words text-base font-bold text-slate-900 dark:text-slate-100">{report.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <Field label="Description" value={report.description} />
          {report.type === "bug" && <Field label="Steps to reproduce" value={report.stepsToReproduce} />}
          {report.type === "bug" && <Field label="Expected behavior" value={report.expectedBehavior} />}
          {report.type === "feature" && <Field label="Motivation" value={report.motivation} />}

          <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-900/40">
            <div>
              <p className={LABEL}>Reported by</p>
              <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                {report.userName || "Unknown"}
                {report.userEmail ? ` · ${report.userEmail}` : ""}
              </p>
            </div>
            <div>
              <p className={LABEL}>Submitted</p>
              <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">{new Date(report.createdAt).toLocaleString()}</p>
            </div>
            {report.context?.pageUrl && (
              <div className="sm:col-span-2">
                <p className={LABEL}>Page</p>
                <p className="mt-1 break-all text-sm text-slate-800 dark:text-slate-200">{report.context.pageUrl}</p>
              </div>
            )}
            {report.context?.userAgent && (
              <div className="sm:col-span-2">
                <p className={LABEL}>Browser</p>
                <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{report.context.userAgent}</p>
              </div>
            )}
          </div>

          {diag && (diag.viewport || diag.screen || diag.platform || diag.language || diag.appVersion) && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-slate-100 bg-slate-50 p-4 text-xs sm:grid-cols-3 dark:border-slate-700 dark:bg-slate-900/40">
              {diag.viewport && <DiagItem label="Viewport" value={diag.viewport} />}
              {diag.screen && <DiagItem label="Screen" value={diag.screen} />}
              {typeof diag.devicePixelRatio === "number" && <DiagItem label="DPR" value={String(diag.devicePixelRatio)} />}
              {diag.platform && <DiagItem label="Platform" value={diag.platform} />}
              {diag.language && <DiagItem label="Language" value={diag.language} />}
              {typeof diag.online === "boolean" && <DiagItem label="Network" value={diag.online ? "online" : "offline"} />}
              {diag.appVersion && <DiagItem label="App version" value={diag.appVersion} />}
            </div>
          )}

          {hasScreenshot && (
            <div>
              <p className={`mb-1.5 flex items-center gap-1.5 ${LABEL}`}>
                <Camera className="h-3.5 w-3.5" /> Screenshot
              </p>
              {screenshot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={screenshot}
                  alt="Reported page screenshot"
                  onClick={() => setPreviewOpen(true)}
                  className="max-h-[32rem] w-full cursor-zoom-in rounded-md border border-slate-200 bg-slate-50 object-contain object-top dark:border-slate-600 dark:bg-slate-900/40"
                />
              ) : (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-600 dark:text-slate-500">
                  {loadingDetail ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading screenshot…
                    </span>
                  ) : (
                    "Screenshot unavailable"
                  )}
                </div>
              )}
            </div>
          )}

          {hasLogs && (
            <div>
              <p className={`mb-1.5 flex items-center gap-1.5 ${LABEL}`}>
                <Terminal className="h-3.5 w-3.5" /> Console logs
                {consoleLogs?.length ? ` (${consoleLogs.length})` : ""}
              </p>
              {consoleLogs?.length ? (
                <div className="max-h-64 overflow-auto rounded-md border border-slate-200 bg-slate-900 p-3 font-mono text-[11px] leading-relaxed dark:border-slate-700">
                  {consoleLogs.map((l, i) => (
                    <div
                      key={i}
                      className={l.level === "error" ? "text-red-400" : l.level === "warn" ? "text-amber-300" : "text-slate-200"}
                    >
                      <span className="select-none text-slate-500">
                        {l.ts ? new Date(l.ts).toLocaleTimeString() + " " : ""}[{l.level}]{" "}
                      </span>
                      <span className="whitespace-pre-wrap break-words">{l.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-600 dark:text-slate-500">
                  {loadingDetail ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading logs…
                    </span>
                  ) : (
                    "Logs unavailable"
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {report.githubIssueUrl ? (
              <a
                href={report.githubIssueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-atria-green-700 hover:underline dark:text-atria-green-300"
              >
                <Github className="h-4 w-4" /> GitHub issue #{report.githubIssueNumber}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Github className="h-4 w-4" />
                {report.githubSyncStatus === "failed" ? "GitHub sync failed" : "Not filed to GitHub"}
              </span>
            )}
            {githubConfigured && !report.githubIssueUrl && (
              <Button variant="outline" disabled={busy} onClick={() => onRetryGithub(report._id)}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {report.githubSyncStatus === "failed" ? "Retry" : "File issue"}
              </Button>
            )}
          </div>

          <div>
            <p className={LABEL}>Admin notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Internal triage notes (not shown to the reporter)…"
              className="mt-1 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-atria-green-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
            />
            {notesDirty && (
              <Button className="mt-2" disabled={savingNotes} onClick={() => void handleSaveNotes()}>
                {savingNotes ? "Saving…" : "Save notes"}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <label htmlFor="detail-status" className={LABEL}>
              Status
            </label>
            <select
              id="detail-status"
              value={report.status}
              disabled={busy}
              onChange={(e) => onStatusChange(report._id, e.target.value as FeedbackStatus)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-atria-green-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              {FEEDBACK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {previewOpen && screenshot && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-6" onClick={() => setPreviewOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={screenshot} alt="Reported page screenshot" className="max-h-full max-w-full rounded-md border border-white/20 shadow-2xl" />
        </div>
      )}
    </div>
  );
}
