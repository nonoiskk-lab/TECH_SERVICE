"use client";

import { useActionState } from "react";
import { customerLoginAction, signupAction, updateProfileAction, type AccountState } from "@/server/customer-actions";

function Msg({ s }: { s: AccountState }) {
  if (!s || (!s.error && !s.ok)) return null;
  return (
    <p role={s.error ? "alert" : "status"} className={`text-sm ${s.error ? "text-danger" : "text-ok"}`}>
      {s.error ?? s.ok}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

type L = Record<string, string>;

export function LoginForm({ l, next }: { l: L; next: string }) {
  const [state, action, pending] = useActionState(customerLoginAction, undefined);
  return (
    <form action={action} className="ts-card space-y-4 p-6" data-testid="account-login" key={JSON.stringify(state?.values ?? {})}>
      <input type="hidden" name="next" value={next} />
      <Field label={l.loginField}>
        <input name="login" className="ts-input" autoComplete="username" required defaultValue={state?.values?.login} data-testid="login-id" />
      </Field>
      <Field label={l.password}>
        <input name="password" type="password" className="ts-input" autoComplete="current-password" required data-testid="login-password" />
      </Field>
      <Msg s={state} />
      <button className="ts-btn ts-btn-primary w-full" disabled={pending}>
        {l.login}
      </button>
    </form>
  );
}

export function SignupForm({ l, next }: { l: L; next: string }) {
  const [state, action, pending] = useActionState(signupAction, undefined);
  const v = state?.values ?? {};
  return (
    <form action={action} className="ts-card space-y-4 p-6" data-testid="account-signup" key={JSON.stringify(v)}>
      <input type="hidden" name="next" value={next} />
      <Field label={l.name}>
        <input name="name" className="ts-input" autoComplete="name" required defaultValue={v.name} data-testid="signup-name" />
      </Field>
      <Field label={l.phone}>
        <input name="phone" inputMode="numeric" maxLength={10} className="ts-input" autoComplete="tel-national" required defaultValue={v.phone} data-testid="signup-phone" />
      </Field>
      <Field label={l.email}>
        <input name="email" type="email" className="ts-input" autoComplete="email" required defaultValue={v.email} data-testid="signup-email" />
      </Field>
      <Field label={l.password}>
        <input name="password" type="password" minLength={8} className="ts-input" autoComplete="new-password" required data-testid="signup-password" />
      </Field>
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input type="checkbox" name="age18" required className="mt-1 h-5 w-5" data-testid="signup-age" /> {l.age18}
      </label>
      <Msg s={state} />
      <button className="ts-btn ts-btn-primary w-full" disabled={pending}>
        {l.signup}
      </button>
    </form>
  );
}

export function ProfileForm({ l, name, email, marketing }: { l: L; name: string; email: string; marketing: boolean }) {
  const [state, action, pending] = useActionState(updateProfileAction, undefined);
  return (
    <form action={action} className="space-y-3" data-testid="account-profile">
      <Field label={l.name}>
        <input name="name" className="ts-input" defaultValue={name} required />
      </Field>
      <Field label={l.email}>
        <input name="email" type="email" className="ts-input" defaultValue={email} required />
      </Field>
      <Field label={l.currentPassword}>
        <input name="currentPassword" type="password" className="ts-input" autoComplete="current-password" />
      </Field>
      <Field label={l.newPassword}>
        <input name="newPassword" type="password" minLength={8} className="ts-input" autoComplete="new-password" />
      </Field>
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input type="checkbox" name="marketing" defaultChecked={marketing} className="mt-1 h-5 w-5" /> {l.marketing}
      </label>
      <Msg s={state} />
      <button className="ts-btn ts-btn-ghost w-full" disabled={pending}>
        {l.save}
      </button>
    </form>
  );
}
