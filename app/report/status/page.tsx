import {cookies} from 'next/headers';
import {parseLocale} from '../../i18n/shared';
import {PublicShell,ReportStatus} from '../../compliance-ui';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function Page(){return <PublicShell locale={parseLocale((await cookies()).get('shabashka_locale')?.value)}><ReportStatus/></PublicShell>;}
