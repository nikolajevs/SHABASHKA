import {cookies} from 'next/headers';
import {parseLocale} from '../i18n/shared';
import {PublicShell,ReportPanel} from '../compliance-ui';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{target?:string}>}){const{target}=await searchParams;return <PublicShell locale={parseLocale((await cookies()).get('shabashka_locale')?.value)}><ReportPanel target={target||''}/></PublicShell>;}
