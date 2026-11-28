"use client";

import { useActionState } from "react";
import type { ActionState } from "@/server/admin/actions";

/** Form wrapper for admin server actions; shows the action's ok/error message. */
export function ActionForm({
  action,
  children,
  className = "space-y-3",
  submit,
  testId,
  danger,
}: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  submit: string;
  testId?: string;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className} data-testid={testId}>
      {children}
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-ok">
          {state.ok}
        </p>
      )}
      <button type="submit" disabled={pending} className={`ts-btn ${danger ? "border border-danger text-danger" : "ts-btn-primary"} text-sm`}>
        {pending ? "…" : submit}
      </button>
    </form>
  );
}
