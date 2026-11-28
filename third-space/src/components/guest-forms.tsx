"use client";

import { useActionState } from "react";
import { findBookingAction, guestCancelAction, type GuestState } from "@/server/guest-actions";

function Msg({ s }: { s: GuestState }) {
  if (!s) return null;
  return (
    <p role={s.error ? "alert" : "status"} className={`text-sm ${s.error ? "text-danger" : "text-ok"}`}>
      {s.error ?? s.ok}
    </p>
  );
}

export function FindBookingForm({ labels }: { labels: { id: string; phone: string; email: string; submit: string } }) {
  const [state, action, pending] = useActionState(findBookingAction, undefined);
  return (
    <form action={action} className="ts-card space-y-3 p-5" data-testid="find-booking" key={JSON.stringify(state?.values ?? {})}>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">{labels.id}</span>
        <input name="bookingId" className="ts-input uppercase" placeholder="TS-XXXXXX" required data-testid="find-id" defaultValue={state?.values?.bookingId} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">{labels.phone}</span>
        <input name="phone" inputMode="numeric" maxLength={10} className="ts-input" required data-testid="find-phone" defaultValue={state?.values?.phone} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">{labels.email}</span>
        <input name="email" type="email" className="ts-input" required data-testid="find-email" defaultValue={state?.values?.email} />
      </label>
      <Msg s={state} />
      <button className="ts-btn ts-btn-primary w-full" disabled={pending}>
        {labels.submit}
      </button>
    </form>
  );
}

export function CancelBookingForm({ bookingId, token, labels }: { bookingId: string; token: string; labels: { confirm: string; submit: string } }) {
  const [state, action, pending] = useActionState(guestCancelAction, undefined);
  if (state?.ok) return <Msg s={state} />;
  return (
    <form action={action} className="space-y-2" data-testid="guest-cancel">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="token" value={token} />
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input type="checkbox" name="confirm" className="mt-1 h-5 w-5" /> {labels.confirm}
      </label>
      <Msg s={state} />
      <button className="ts-btn border border-danger text-sm text-danger" disabled={pending}>
        {labels.submit}
      </button>
    </form>
  );
}
