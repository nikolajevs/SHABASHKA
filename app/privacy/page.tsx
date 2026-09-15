import {cookies} from 'next/headers';
import {parseLocale} from '../i18n/shared';
import {PublicShell,PrivacyPanel} from '../compliance-ui';
export const dynamic='force-dynamic';
export default async function Page(){return <PublicShell locale={parseLocale((await cookies()).get('shabashka_locale')?.value)}><PrivacyPanel/></PublicShell>;}
