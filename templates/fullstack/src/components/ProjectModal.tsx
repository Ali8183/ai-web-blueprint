"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";
import type {
  ProjectDiscipline,
  ProjectPriority,
  ProjectStatus,
} from "@/server/db/schema";
import type { ProjectDto } from "@/server/services/projects";
import { useFocusTrap } from "./useFocusTrap";

interface ProjectModalProps {
  mode: "create" | "edit";
  project?: ProjectDto;
  studioCode: string;
  onClose: () => void;
  onSaved: (project: ProjectDto, action: "created" | "updated") => void;
}

export function ProjectModal({
  mode,
  project,
  studioCode,
  onClose,
  onSaved,
}: ProjectModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, dialogRef, onClose);

  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const [code, setCode] = useState(project?.code ?? `${studioCode}-101`);
  const [title, setTitle] = useState(project?.title ?? "");
  const [clientName, setClientName] = useState(project?.clientName ?? "");
  const [discipline, setDiscipline] = useState<ProjectDiscipline>(
    project?.discipline ?? "architecture"
  );
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "planning");
  const [priority, setPriority] = useState<ProjectPriority>(project?.priority ?? "medium");
  const [budgetWhole, setBudgetWhole] = useState(
    project ? String(Math.round(project.budgetCents / 100)) : "0"
  );
  const [dueDate, setDueDate] = useState(
    project?.dueDate ? project.dueDate.slice(0, 10) : ""
  );
  const [summary, setSummary] = useState(project?.summary ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedBudget = Number(budgetWhole);
    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
      setError("Budget must be a non-negative number.");
      return;
    }

    setSaving(true);
    try {
      const budgetCents = Math.round(parsedBudget * 100);
      const dueDateIso = dueDate.trim() ? new Date(`${dueDate.trim()}T12:00:00Z`).toISOString() : null;

      if (mode === "create") {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            code,
            title,
            clientName,
            discipline,
            status,
            priority,
            budgetCents,
            dueDate: dueDateIso,
            summary,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          project?: ProjectDto;
          error?: { message?: string };
        } | null;

        if (!res.ok || !data?.project) {
          setError(data?.error?.message || "Failed to create project.");
          return;
        }
        onSaved(data.project, "created");
      } else if (project) {
        const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version: project.version,
            code,
            title,
            clientName,
            discipline,
            status,
            priority,
            budgetCents,
            dueDate: dueDateIso,
            summary,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          project?: ProjectDto;
          error?: { message?: string };
        } | null;

        if (!res.ok || !data?.project) {
          setError(data?.error?.message || "Failed to update project.");
          return;
        }
        onSaved(data.project, "updated");
      }
    } catch {
      setError("Network error while saving project. Your form values were preserved.");
    } finally {
      setSaving(false);
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
        aria-labelledby="project-modal-title"
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <p className="font-mono-ledger text-xs uppercase tracking-widest text-[var(--ink-muted)]">
              {mode === "create" ? "New Ledger Entry" : `Edit Entry · Rev v${project?.version}`}
            </p>
            <h2 id="project-modal-title" className="font-editorial mt-1 text-xl font-semibold">
              {mode === "create" ? "Register studio project" : project?.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project dialog"
            className="btn-secondary min-h-9 px-2.5 py-1.5"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          {error && (
            <div
              role="alert"
              className="border border-[var(--danger)] bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm text-[var(--danger)]"
            >
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="project-code" className="mb-1 block text-sm font-medium">
                Project code
              </label>
              <input
                id="project-code"
                name="code"
                type="text"
                required
                className="field-input font-mono-ledger uppercase"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="AK-105"
              />
            </div>

            <div>
              <label htmlFor="project-client" className="mb-1 block text-sm font-medium">
                Client
              </label>
              <input
                id="project-client"
                name="clientName"
                type="text"
                required
                className="field-input"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Karaköy Maritime Trust"
              />
            </div>
          </div>

          <div>
            <label htmlFor="project-title" className="mb-1 block text-sm font-medium">
              Project title
            </label>
            <input
              id="project-title"
              name="title"
              type="text"
              required
              className="field-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Galata Timber Structural Survey"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="project-discipline" className="mb-1 block text-sm font-medium">
                Discipline
              </label>
              <select
                id="project-discipline"
                name="discipline"
                className="field-input"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value as ProjectDiscipline)}
              >
                <option value="architecture">Architecture</option>
                <option value="structural">Structural</option>
                <option value="interior">Interior</option>
                <option value="urban">Urban</option>
              </select>
            </div>

            <div>
              <label htmlFor="project-status" className="mb-1 block text-sm font-medium">
                Status
              </label>
              <select
                id="project-status"
                name="status"
                className="field-input"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="review">Review</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label htmlFor="project-priority" className="mb-1 block text-sm font-medium">
                Priority
              </label>
              <select
                id="project-priority"
                name="priority"
                className="field-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProjectPriority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="project-budget" className="mb-1 block text-sm font-medium">
                Fee budget (USD)
              </label>
              <input
                id="project-budget"
                name="budget"
                type="number"
                min="0"
                step="1"
                className="field-input font-mono-ledger"
                value={budgetWhole}
                onChange={(e) => setBudgetWhole(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="project-due" className="mb-1 block text-sm font-medium">
                Target milestone date
              </label>
              <input
                id="project-due"
                name="dueDate"
                type="date"
                className="field-input font-mono-ledger"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="project-summary" className="mb-1 block text-sm font-medium">
              Scope notes
            </label>
            <textarea
              id="project-summary"
              name="summary"
              rows={3}
              className="field-input min-h-[88px]"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Deliverables, structural grid constraints, and review milestones."
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving
                ? "Saving entry…"
                : mode === "create"
                  ? "Create project"
                  : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
