"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const sizeClass = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  }[size];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10 sm:pt-16">
      <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full rounded-2xl bg-white shadow-[var(--shadow-popover)]",
          sizeClass
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] p-5">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto scroll-thin p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] p-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "primary",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-600">{description}</p>
    </Modal>
  );
}
