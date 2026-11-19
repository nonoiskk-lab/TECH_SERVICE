import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminEnabled, currentStaff } from "@/server/admin/auth";
import { loginAction } from "@/server/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { Wordmark } from "@/components/site-header";

export const metadata: Metadata = { title: "Admin login | THIRD SPACE", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await currentStaff()) redirect("/admin");
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <Wordmark className="mb-6 text-2xl" />
      {adminEnabled() ? (
        <ActionForm action={loginAction} submit="Log in" testId="admin-login">
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Your name</span>
            <input name="name" className="ts-input" autoComplete="name" required data-testid="admin-name" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Staff password</span>
            <input name="password" type="password" className="ts-input" autoComplete="current-password" required data-testid="admin-password" />
          </label>
        </ActionForm>
      ) : (
        <p className="ts-card p-4 text-sm text-muted">The admin panel is off. Set ADMIN_PASSWORD and AUTH_SECRET on the server to turn it on.</p>
      )}
    </main>
  );
}
