import "server-only";
import { db } from "@/server/db";

export type GalleryItem = { id: string; url: string; alt: string; category: string };
export type TestimonialItem = { id: string; name: string; text: string; source: string; rating: number | null };

/** Active gallery photos uploaded by admin. Empty when none (pages then show illustrations). */
export async function galleryImages(limit = 60): Promise<GalleryItem[]> {
  try {
    return await db.galleryImage.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: limit,
      select: { id: true, url: true, alt: true, category: true },
    });
  } catch {
    return [];
  }
}

/** Real testimonials entered by admin (with their source). Never invented; empty hides the section. */
export async function testimonials(limit = 6): Promise<TestimonialItem[]> {
  try {
    return await db.testimonial.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, name: true, text: true, source: true, rating: true },
    });
  } catch {
    return [];
  }
}
