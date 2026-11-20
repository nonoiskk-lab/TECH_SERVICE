import type { Dict } from "@/i18n";
import type { GalleryItem, TestimonialItem } from "@/server/content";
import { CelebrationScene, CreatorScene, PodcastScene, RoomScene } from "@/components/illustrations";

const FALLBACK = [
  { id: "podcast", Art: PodcastScene },
  { id: "creator", Art: CreatorScene },
  { id: "celebration", Art: CelebrationScene },
  { id: "room", Art: RoomScene },
];

/** Photo grid; falls back to labelled illustrations until real photos are uploaded. */
export function GalleryGrid({ images, t, limit }: { images: GalleryItem[]; t: Dict; limit?: number }) {
  if (images.length === 0) {
    return (
      <div>
        <p className="mb-4 text-sm text-faint" data-testid="gallery-empty">
          {t.pages.galleryEmpty}
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {FALLBACK.map(({ id, Art }) => (
            <div key={id} aria-hidden="true" className="aspect-square overflow-hidden rounded-2xl border border-line">
              <Art className="h-full w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  const list = limit ? images.slice(0, limit) : images;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3" data-testid="gallery">
      {list.map((g) => (
        // eslint-disable-next-line @next/next/no-img-element -- admin-supplied external URLs
        <img key={g.id} src={g.url} alt={g.alt} loading="lazy" className="aspect-square w-full rounded-2xl border border-line object-cover" />
      ))}
    </div>
  );
}

export function Testimonials({ items }: { items: TestimonialItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3" data-testid="testimonials">
      {items.map((x) => (
        <figure key={x.id} className="ts-card ts-glow p-6">
          {x.rating ? (
            <p className="text-warm" aria-label={`${x.rating}/5`}>
              {"★".repeat(Math.max(0, Math.min(5, x.rating)))}
            </p>
          ) : null}
          <blockquote className="mt-2 text-muted">“{x.text}”</blockquote>
          <figcaption className="mt-4 text-sm">
            <strong>{x.name}</strong> <span className="text-faint">· {x.source}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function MapEmbed({ address, title }: { address: string; title: string }) {
  return (
    <iframe
      title={title}
      src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
      className="aspect-video w-full rounded-2xl border border-line"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}

/** Equipment / facilities table for a space. Renders nothing when staff have not entered a list. */
export function EquipmentList({ items, title }: { items: { name: string; detail: string }[]; title: string }) {
  if (items.length === 0) return null;
  return (
    <section className="ts-section" id="equipment" aria-labelledby="equipment-h">
      <div className="mx-auto max-w-[var(--ts-maxw)] px-4">
        <h2 id="equipment-h" className="mb-8 text-3xl leading-tight sm:text-5xl">
          {title}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="equipment">
          {items.map((i) => (
            <li key={i.name + i.detail} className="ts-card p-5">
              <p className="font-semibold">{i.name}</p>
              {i.detail && <p className="mt-1 text-sm text-muted">{i.detail}</p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
