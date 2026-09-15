import {cookies} from 'next/headers';
import {notFound} from 'next/navigation';
import {parseLocale} from '../../i18n/shared';
import {PublicShell} from '../../compliance-ui';
import LegalDocument from '../document';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{document:string}>}){const{document}=await params;if(!['terms','privacy','cookies'].includes(document))notFound();return <PublicShell locale={parseLocale((await cookies()).get('shabashka_locale')?.value)}><LegalDocument document={document as 'terms'|'privacy'|'cookies'}/></PublicShell>;}
