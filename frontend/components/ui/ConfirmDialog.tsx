"use client";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Button } from "./Button";
import { AlertTriangle, X } from "lucide-react";

export function ConfirmDialog({
  open,
  title = "Confirm",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
  loading = false,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-[6px] border border-[var(--border)] bg-[#14171d] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-red-500/15 text-red-300">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="text-lg font-semibold">{title}</div>
              <div className="text-sm text-[var(--muted)]">{message}</div>
            </div>
          </div>
          <button onClick={onCancel} className="text-[var(--muted)] hover:text-[var(--text)]"><X size={18} /></button>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
          <Button className={danger ? "bg-red-600 hover:bg-red-500" : ""} onClick={onConfirm} disabled={loading}>{loading ? "Processing…" : confirmLabel}</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
