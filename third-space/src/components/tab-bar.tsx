import Link from "next/link";
import { CalendarIcon, HomeIcon, UserIcon } from "./icons";

/** Tab Bar (Home, Bookings, Profile): the customer app navigation on phones. Hidden from tablet width up, where the header has the same links. */
export function TabBar({ current, labels }: { current: "home" | "bookings" | "profile"; labels: { home: string; bookings: string; profile: string; nav: string } }) {
  const items = [
    { id: "home", href: "/", label: labels.home, Icon: HomeIcon },
    { id: "bookings", href: "/account", label: labels.bookings, Icon: CalendarIcon },
    { id: "profile", href: "/account#profile", label: labels.profile, Icon: UserIcon },
  ] as const;
  return (
    <nav aria-label={labels.nav} className="ts-tabbar ts-glass md:hidden" data-testid="tab-bar">
      {items.map(({ id, href, label, Icon }) => (
        <Link key={id} href={href} aria-current={current === id ? "page" : undefined}>
          <Icon className="h-6 w-6" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
