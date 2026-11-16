"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";
import type { ProjectDto } from "@/server/services/projects";
import { useFocusTrap } from "./useFocusTrap";

interface DeleteProjectModalProps {
  project: ProjectDto;
  onClose: () => void;
  onDeleted: (projectId: string, code: string) => void;
}

export function DeleteProjectModal({
  project,
  onClose,
  onDeleted,
}: DeleteProjectModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, dialogRef, onClose);

  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setDeleting(true);

    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!res.ok) {
        setError(data?.error?.message || "Failed to delete project.");
        return;
      }

      onDeleted(project.id, project.code);
    } catch {
      setError("Network error while deleting project.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        tabIndex={-1}
        className="w-full max-w-md border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <p className="font-mono-ledger text-xs uppercase tracking-widest text-[var(--danger)]">
              Permanent Removal
            </p>
            <h2 id="delete-modal-title" className="font-editorial mt-1 text-xl font-semibold">
              Delete {project.code}?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close delete dialog"
            className="btn-secondary min-h-9 px-2.5 py-1.5"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-4 text-sm text-[var(--ink-muted)]">
          This removes <strong className="text-[var(--ink-primary)]">{project.title}</strong> from
          the studio ledger. Only studio owners can perform deletions.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 border border-[var(--danger)] bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm text-[var(--danger)]"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="btn-danger"
          >
            {deleting ? "Deleting…" : "Confirm delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
