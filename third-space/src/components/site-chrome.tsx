import { isLegalGateOpen } from "@/config/site";
import { fromPrice } from "@/config/packages";
import { getDict } from "@/lib/locale";
import { publicBusiness, whatsappHref } from "@/lib/business";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { StickyBookBar, WhatsAppButton } from "./floating";
import { FirstTouch, HideOn } from "./client-bits";
import { JsonLd, localBusinessLd } from "./json-ld";

/** Public-site frame: header, footer, WhatsApp button, sticky price bar, LocalBusiness JSON-LD. */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getDict();
  const gateOpen = isLegalGateOpen();
  const biz = publicBusiness(locale);
  return (
    <>
      <FirstTouch />
      <JsonLd data={localBusinessLd(biz)} />
      <SiteHeader t={t} locale={locale} />
      <main id="main">{children}</main>
      <SiteFooter t={t} biz={biz} gateOpen={gateOpen} />
      <WhatsAppButton href={whatsappHref(biz.whatsapp, t.whatsappPrefill)} label={t.common.whatsapp} />
      <HideOn prefixes={["/book"]}>
        <StickyBookBar t={t} fromPrice={fromPrice(gateOpen)} />
      </HideOn>
    </>
  );
}
