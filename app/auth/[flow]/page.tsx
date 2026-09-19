import {cookies} from 'next/headers';
import {notFound} from 'next/navigation';
import {PublicShell} from '../../compliance-ui';
import {AuthTokenPage} from '../../auth-ui';
import {parseLocale} from '../../i18n/shared';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function Page({params}:{params:Promise<{flow:string}>}){const{flow}=await params;if(flow!=='reset'&&flow!=='verify')notFound();return <PublicShell locale={parseLocale((await cookies()).get('shabashka_locale')?.value)}><AuthTokenPage mode={flow}/></PublicShell>;}
