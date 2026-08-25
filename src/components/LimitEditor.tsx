"use client";
import { useEffect, useState } from "react";
import { RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui";

/** Inline number editor for a single cap value, with an optional Reset. */
export function LimitEditor({
  value,
  onSave,
  onReset,
  canReset,
  busy,
}: {
  value: number;
  onSave: (v: number) => void;
  onReset?: () => void;
  canReset?: boolean;
  busy?: boolean;
}) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);

  const n = Number(v);
  const changed = v.trim() !== "" && Number.isFinite(n) && n >= 0 && n !== value;

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        value={v}
        onChange={(e) => setV(e.target.value)}
        disabled={busy}
        className="w-20 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-900 focus:border-atria-green-600 focus:outline-none focus:ring-2 focus:ring-atria-green-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      />
      <Button variant="outline" disabled={!changed || busy} onClick={() => onSave(n)} title="Save">
        <Check className="h-3.5 w-3.5" /> Save
      </Button>
      {canReset && onReset && (
        <Button variant="ghost" disabled={busy} onClick={onReset} title="Reset to the level below">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      )}
    </div>
  );
}
