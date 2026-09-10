import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { navForRole, settingsNavForRole } from "@/lib/nav";
import { AppShell } from "@/components/app-shell/app-shell";
import type { Role } from "@/lib/constants";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = session.role as Role;

  return (
    <AppShell
      navItems={navForRole(role)}
      settingsItems={settingsNavForRole(role)}
      user={{ name: session.name, email: session.email, role }}
    >
      {children}
    </AppShell>
  );
}
