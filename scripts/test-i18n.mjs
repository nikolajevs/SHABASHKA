import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const rows=JSON.parse(fs.readFileSync('app/i18n/messages.json','utf8'));
const keys=new Set(rows.map(r=>r[0]));assert.equal(keys.size,rows.length,'Duplicate translation keys');
for(const [ru,lv,en,uk] of rows){assert.ok(ru&&lv&&en&&uk);const slots=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();assert.deepEqual(slots(lv),slots(ru),ru);assert.deepEqual(slots(en),slots(ru),ru);assert.deepEqual(slots(uk),slots(ru),ru);assert.ok(!/[ыэъёЫЭЪЁ]/.test(uk),`Russian letters in Ukrainian: ${ru}`);assert.ok(!/[А-Яа-яЁё]/.test(lv+en),`Untranslated: ${ru}`);}
for(const file of ['app/market.tsx','app/i18n/provider.tsx','app/layout.tsx','app/compliance-ui.tsx']){const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function visit(n){if(ts.isCallExpression(n)&&['t','translate'].includes(n.expression.getText(sf))){const arg=n.arguments[n.expression.getText(sf)==='translate'?1:0];if(arg&&ts.isStringLiteral(arg))assert.ok(keys.has(arg.text.trim()),`Missing: ${arg.text}`);}if(ts.isJsxText(n))assert.ok(!/[А-Яа-яЁё]/.test(n.text),`Hardcoded JSX in ${file}: ${n.text}`);ts.forEachChild(n,visit);}visit(sf);}
let shared=fs.readFileSync('app/i18n/shared.ts','utf8').replace('import messages from "./messages.json";',`const messages=${JSON.stringify(rows)};`);
const js=ts.transpileModule(shared,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {translate,translateError,parseLocale}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
assert.equal(parseLocale('bad'),'lv');assert.equal(parseLocale(null),'lv');
assert.equal(translate('lv','Рига'),'Rīga');assert.equal(translate('en','Рига'),'Riga');assert.equal(translate('ru','Рига'),'Рига');
assert.equal(translate('en','Ваша роль: {role}',{role:'customer'}),'Your role: customer');
assert.equal(translateError('en','Заполните корректно: name'),'Please check: Your name');
assert.equal(translateError('lv','Заполните корректно: name'),'Aizpildiet pareizi: Jūsu vārds');
assert.equal(translate('en','Я авторский текст'), 'Я авторский текст');
const origin=process.env.TEST_ORIGIN||'http://localhost:5173';if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Local test only');
for(const locale of ['lv','en','ru','uk','invalid']){const active=parseLocale(locale);const response=await fetch(origin+'/',{headers:{Cookie:`shabashka_locale=${locale}`,Connection:'close'}});assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes(`lang="${active}"`));assert.ok(html.includes(translate(active,'SHABASHKA — услуги в Латвии')));assert.ok(html.includes(translate(active,'Найти специалиста')));
const rejected=await fetch(origin+'/api/market',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-SHABASHKA-Language':locale,Connection:'close'},body:'{}'});assert.equal(rejected.status,401);assert.equal(rejected.headers.get('content-language'),active);const body=await rejected.json();assert.equal(body.error,translate(active,'Войдите, чтобы сохранить данные.'));assert.equal(body.errorKey,'Войдите, чтобы сохранить данные.');}
console.log(`PASS: ${rows.length} complete translation entries, placeholders, source coverage, locale fallback, server-rendered language and API errors in all four languages.`);

assert.equal(parseLocale('uk'),'uk');
assert.equal(translateError('uk','Заполните корректно: name'),'Заповніть коректно: Ваше ім’я');
assert.equal(translate('uk','Ваша роль: {role}',{role:'замовник'}),'Ваша роль: замовник');
for(const [page,title,count] of [['terms','Умови використання',7],['privacy','Політика конфіденційності',8],['cookies','Cookie та налаштування',2]]) {
 const response=await fetch(origin+'/legal/'+page,{headers:{Cookie:'shabashka_locale=uk'}});
 assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes(title));assert.ok(html.includes('Проєкт документів.'));assert.ok(html.includes('lang="uk"'));assert.equal((html.match(/<h2/g)||[]).length,count);
}
console.log('PASS: Ukrainian legal documents and dynamic validation messages.');
