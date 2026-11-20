import { db } from "@/server/db";
import { requireRole } from "@/server/admin/auth";
import { saveGalleryImageAction, saveTestimonialAction, toggleContentAction } from "@/server/admin/manage";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, H1, Status } from "@/components/admin/ui";

export default async function ContentPage() {
  await requireRole("content");
  const [reviews, images] = await Promise.all([db.testimonial.findMany({ orderBy: { createdAt: "desc" } }), db.galleryImage.findMany({ orderBy: { sortOrder: "asc" } })]);
  return (
    <>
      <H1>Gallery & reviews</H1>
      <div className="grid gap-4 lg:grid-cols-2">
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
