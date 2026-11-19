import Link from "next/link";
import type { Dict } from "@/i18n";
import { formatINR } from "@/lib/pricing";
import { TrackedAnchor } from "./client-bits";

export function WhatsAppButton({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  return (
    <TrackedAnchor
      event="whatsapp_click"
      props={{ placement: "floating" }}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      data-testid="whatsapp-float"
      className="fixed bottom-24 right-4 z-40 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#25D366] text-[#08260f] shadow-xl sm:bottom-6"
    >
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="currentColor">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.2-.2-.5-.3Z" />
      </svg>
    </TrackedAnchor>
  );
}

/** Mobile-only sticky bar: "From ₹X · Book now". Price comes from config via props. */
export function StickyBookBar({ t, fromPrice }: { t: Dict; fromPrice: number }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:hidden" data-testid="sticky-bar">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {t.common.from} <strong className="text-lg text-text" data-testid="from-price">{formatINR(fromPrice)}</strong>
        </p>
        <Link href="/book" className="ts-btn ts-btn-primary">
          {t.stickyBar}
        </Link>
      </div>
    </div>
  );
}
