"use client";

import { useActionState, useState } from "react";
import { submitFeedbackAction } from "@/server/feedback-actions";

type L = { rating: string; stars: string[]; comment: string; allowPublish: string; submit: string };

/** 1–5 rating as a radio group (keyboard and screen-reader friendly), comment and an explicit publish consent. */
export function FeedbackForm({ bookingId, token, l }: { bookingId: string; token: string; l: L }) {
  const [state, action, pending] = useActionState(submitFeedbackAction, undefined);
  const [rating, setRating] = useState(0);
  return (
    <form action={action} className="ts-card space-y-5 p-6" data-testid="feedback-form">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="token" value={token} />
      <fieldset>
        <legend className="mb-3 text-sm text-muted">{l.rating}</legend>
        <div className="flex flex-wrap gap-2">
          {l.stars.map((label, i) => {
            const n = i + 1;
            return (
              <label
                key={n}
                className={`flex min-h-11 min-w-11 cursor-pointer flex-col items-center justify-center rounded-xl border px-3 py-2 text-sm transition-colors ${
                  rating >= n ? "border-gold bg-gold text-on-gold" : "border-line hover:border-gold"
                }`}
              >
                <input type="radio" name="rating" value={n} className="sr-only" onChange={() => setRating(n)} required data-testid={`rating-${n}`} />
                <span aria-hidden="true" className="text-lg leading-none">
                  ★
                </span>
                <span className="mt-1 text-xs">{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">{l.comment}</span>
        <textarea name="comment" rows={4} maxLength={1000} className="ts-input" data-testid="feedback-comment" />
      </label>
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input type="checkbox" name="allowPublish" className="mt-1 h-5 w-5" data-testid="feedback-publish" /> {l.allowPublish}
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button className="ts-btn ts-btn-primary w-full" disabled={pending || rating === 0} data-testid="feedback-submit">
        {l.submit}
      </button>
    </form>
  );
}
