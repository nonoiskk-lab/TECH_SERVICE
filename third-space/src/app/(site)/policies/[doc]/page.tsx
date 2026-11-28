import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLegalGateOpen } from "@/config/site";
import { legalContact, POLICY_DOCS, type PolicyDocId } from "@/config/policies";
import { ADDENDA, MASTER_SECTIONS } from "@/config/policy-texts";
import { getDict } from "@/lib/locale";
import { publicBusiness } from "@/lib/business";
import { Container, PageHeader } from "@/components/ui";
import { PolicyStatusBanner } from "@/components/policy-bits";

const DOCS: PolicyDocId[] = ["safety", "theatre", "podcast", "creator"];

function resolve(doc: string): PolicyDocId | null {
  if (!DOCS.includes(doc as PolicyDocId)) return null;
  // While the Legal Gate is closed the theatre service does not exist on the site.
  if (doc === "theatre" && !isLegalGateOpen()) return null;
  return doc as PolicyDocId;
}

export async function generateMetadata({ params }: PageProps<"/policies/[doc]">): Promise<Metadata> {
  const id = resolve((await params).doc);
  if (!id) return { robots: { index: false } };
  return { title: `${POLICY_DOCS[id].title} | THIRD SPACE`, alternates: { canonical: POLICY_DOCS[id].path } };
}

/** Section 11 is filled from env; lines without a value are left out, never shown as placeholders. */
function ContactSection({ heading }: { heading: string }) {
  const c = legalContact();
  const biz = publicBusiness("en");
  const grievance = [c.grievanceName, c.grievanceDesignation, c.grievanceEmail, c.grievancePhone, c.grievanceAddress].filter(Boolean).join(", ");
  const entity = [c.entityName, c.entityAddress].filter(Boolean).join(", ");
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold">{heading}</h2>
      <div className="ts-prose mt-3 text-muted">
        <p>
          THIRD SPACE may update these Terms prospectively. The version accepted at booking is preserved for that booking; material changes affecting an
          existing booking will be handled lawfully and transparently.
        </p>
        {grievance && <p data-testid="grievance">Complaints/grievances: {grievance}.</p>}
        {!grievance && (biz.phone || biz.email) && <p>Complaints: {[biz.phone, biz.email].filter(Boolean).join(", ")}.</p>}
        {entity && <p>Legal entity: {entity}.</p>}
        {c.effectiveDate && <p>Effective date: {c.effectiveDate}.</p>}
      </div>
    </section>
  );
}

export default async function PolicyDocPage({ params }: PageProps<"/policies/[doc]">) {
  const id = resolve((await params).doc);
  if (!id) notFound();
  const { t } = await getDict();
  const add = id === "safety" ? null : ADDENDA[id];
  return (
    <>
      <PageHeader title={add ? add.title : "Master 18+ Safety & Conduct Policy"} intro={add ? add.subtitle : "Applies to Private Theatre • Podcast Studio • Creator Studio"} />
      <Container className="py-10">
        <PolicyStatusBanner t={t} />
        <article className="max-w-3xl" lang="en" data-testid={`policy-${id}`}>
          {add && (
            <section className="mb-8">
              <h2 className="text-xl font-bold">Service-specific rules</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
                {add.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-faint">The Master 18+ Safety &amp; Conduct Policy below also applies in full.</p>
            </section>
          )}
          {MASTER_SECTIONS.map((s) => (
            <section key={s.heading} className="mt-8">
              <h2 className="text-xl font-bold">{s.heading}</h2>
              <div className="ts-prose mt-3 text-muted">
                {s.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))}
              </div>
            </section>
          ))}
          <ContactSection heading="11. Updates, complaints and contact" />
        </article>
      </Container>
    </>
  );
}
