import { cookies } from "next/headers";
import Market from "./market";
import { LanguageProvider } from "./i18n/provider";
import { parseLocale } from "./i18n/shared";
import {LegalFooter} from './compliance-ui';
export const dynamic = "force-dynamic";
export default async function Page() {
  const locale = parseLocale((await cookies()).get("shabashka_locale")?.value);
  return (
    <LanguageProvider initialLocale={locale}>
      <Market />
      <LegalFooter />
    </LanguageProvider>
  );
}
