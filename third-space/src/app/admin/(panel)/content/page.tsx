import { db } from "@/server/db";
import { requireRole } from "@/server/admin/auth";
import { publishFeedbackAction, saveGalleryImageAction, saveTestimonialAction, toggleContentAction } from "@/server/admin/manage";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, H1, Status } from "@/components/admin/ui";

export default async function ContentPage() {
  await requireRole("content");
  const [reviews, images, feedback, agg] = await Promise.all([
    db.testimonial.findMany({ orderBy: { createdAt: "desc" } }),
    db.galleryImage.findMany({ orderBy: { sortOrder: "asc" } }),
    db.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { booking: { select: { id: true, packageName: true, packageId: true, start: true } } } }),
    db.feedback.aggregate({ _avg: { rating: true }, _count: true }),
  ]);
  return (
    <>
      <H1>Gallery & reviews</H1>
      <Card title="Guest feedback" testId="feedback-inbox">
        <p className="mb-3 text-sm text-muted">
          {agg._count} responses{agg._avg.rating ? ` · average ${agg._avg.rating.toFixed(1)} / 5` : ""}. Guests rate their visit from the link in the feedback message. Publish only
          what the guest allowed; the website shows first name and initial.
        </p>
        <ul className="divide-y divide-line/60 text-sm">
          {feedback.map((fb) => (
            <li key={fb.id} className="flex flex-wrap items-start justify-between gap-3 py-3" data-testid="feedback-row">
              <span className="min-w-0 flex-1">
                <strong className="text-warm">{"★".repeat(fb.rating)}</strong> {fb.displayName} ·{" "}
                <a href={`/admin/bookings/${fb.booking.id}`} className="underline-offset-4 hover:underline">
                  {fb.booking.id}
                </a>{" "}
                · {fb.booking.packageName || fb.booking.packageId}
                {fb.comment && <span className="mt-1 block text-muted">“{fb.comment}”</span>}
                <span className="mt-1 block text-xs text-faint">{fb.allowPublish ? "Guest allowed publishing" : "Private: not for publishing"}</span>
              </span>
              {fb.testimonialId ? (
                <Status value="published" />
              ) : fb.allowPublish && fb.comment.length >= 10 ? (
                <ActionForm action={publishFeedbackAction} submit="Publish as review">
                  <input type="hidden" name="id" value={fb.id} />
                </ActionForm>
              ) : null}
            </li>
          ))}
          {feedback.length === 0 && <li className="py-2 text-muted">No feedback yet.</li>}
        </ul>
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Customer reviews" testId="reviews">
          <p className="mb-2 text-sm text-muted">Only real reviews, with where they were posted. The home page hides this section until there is at least one.</p>
          <ul className="mb-3 space-y-2 text-sm">
            {reviews.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-2 border-b border-line/50 pb-2">
                <span>
                  “{r.text}” · {r.name} · {r.source}
                </span>
                <form action={toggleContentAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="type" value="testimonial" />
                  <button aria-label="Show or hide">
                    <Status value={r.active ? "active" : "hidden"} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <ActionForm action={saveTestimonialAction} submit="Add review">
            <Field label="Name">
              <input name="name" className="ts-input" />
            </Field>
            <Field label="Review text">
              <textarea name="text" className="ts-input min-h-16" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Source (e.g. Google, 12 Dec 2026)">
                <input name="source" className="ts-input" />
              </Field>
              <Field label="Rating (1–5, optional)">
                <input name="rating" type="number" min={1} max={5} className="ts-input" />
              </Field>
            </div>
          </ActionForm>
        </Card>
        <Card title="Gallery photos" testId="gallery-admin">
          <p className="mb-2 text-sm text-muted">Paste https links to photos of the venue (your own photos). Until there are photos, the site shows its illustrations.</p>
          <ul className="mb-3 grid grid-cols-3 gap-2">
            {images.map((g) => (
              <li key={g.id} className="text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt={g.alt} className="aspect-square w-full rounded-lg object-cover" />
                <form action={toggleContentAction} className="mt-1">
                  <input type="hidden" name="id" value={g.id} />
                  <input type="hidden" name="type" value="gallery" />
                  <button>
                    <Status value={g.active ? "active" : "hidden"} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <ActionForm action={saveGalleryImageAction} submit="Add photo">
            <Field label="Image URL (https)">
              <input name="url" className="ts-input" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Description (alt text)">
                <input name="alt" className="ts-input" />
              </Field>
              <Field label="Category">
                <select name="category" className="ts-input">
                  <option value="theatre">Private Theatre</option>
                  <option value="studio">Studio</option>
                  <option value="celebration">Celebrations</option>
                </select>
              </Field>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
