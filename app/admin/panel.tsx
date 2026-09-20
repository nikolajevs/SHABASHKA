"use client";
import AdminReports from './reports';
import '../compliance.css';
import {useCallback,useEffect,useState} from "react";
import {ShieldCheck,Users,ClipboardList,BriefcaseBusiness,Star,History,Search,RefreshCw} from "lucide-react";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/ui/dialog";
const sections=[{key:"report",label:"Жалобы",icon:ShieldCheck},{key:"account",label:"Пользователи",icon:Users},{key:"task",label:"Задания",icon:ClipboardList},{key:"profile",label:"Профили",icon:BriefcaseBusiness},{key:"review",label:"Отзывы",icon:Star},{key:"audit",label:"Журнал действий",icon:History}];
type Entry={deleted?:boolean;erased?:boolean;adminErased?:boolean;id:string;kind:string;owner:string;created:string;restricted:boolean;self:boolean;name?:string;title?:string;description?:string;role?:string;city?:string;status?:string;price?:string;skills?:string;portfolio?:string;rating?:number;reason?:string;actor?:string;action?:string;target?:string;targetKind?:string};
type Result={rows:Entry[];total:number;counts:Record<string,number>;page:number};
const date=(value:string)=>new Date(value).toLocaleString("ru-LV",{dateStyle:"medium",timeStyle:"short"});
const state=(value?:string)=>({open:"Принимает отклики",active:"В работе",complete:"Завершено"}[value||""]||value);
export default function AdminPanel(){
  const [kind,setKind]=useState("account"),[query,setQuery]=useState(""),[search,setSearch]=useState(""),[page,setPage]=useState(1);
  const [data,setData]=useState<Result|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [selected,setSelected]=useState<Entry|null>(null),[reason,setReason]=useState(""),[basis,setBasis]=useState(""),[saving,setSaving]=useState(false),[actionError,setActionError]=useState("");
  const [deleteMode,setDeleteMode]=useState(false),[confirmation,setConfirmation]=useState("");
  const [revision,setRevision]=useState(0);
  const reload=useCallback(()=>setRevision(v=>v+1),[]);
  useEffect(()=>{document.documentElement.lang="ru";},[]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError("");
    fetch(`/api/admin?${new URLSearchParams({kind,q:search,page:String(page)})}`,{cache:"no-store",signal:controller.signal})
      .then(async r=>{const b=await r.json() as Result & {error?:string};if(!r.ok)throw Error(b.error);return b as Result;})
      .then(setData).catch(e=>{if(e.name!=="AbortError"){setData(null);setError(e.message||"Не удалось загрузить данные.");}})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[kind,search,page,revision]);
  async function save(e:React.FormEvent){e.preventDefault();if(!selected||saving)return;setSaving(true);setActionError("");
    try{const r=await fetch("/api/admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:selected.id,action:deleteMode?"delete":selected.restricted?"restore":"restrict",reason,basis,confirm:confirmation})});const b=await r.json() as Result & {error?:string};if(!r.ok)throw Error(b.error);setNotice("Изменение сохранено в журнале.");setSelected(null);reload();}
    catch(e){setActionError(e instanceof Error?e.message:"Не удалось сохранить.");}finally{setSaving(false);}
  }
  return <main className="admin-shell" lang="ru">
    <header className="admin-header"><a className="admin-brand" href="/">Gigs<span>Управление площадкой</span></a><a href="/">На сайт ↗</a></header>
    <div className="admin-heading"><div><p className="admin-eyebrow"><ShieldCheck size={18}/> Доступ администратора</p><h1>Панель управления</h1></div><button className="outline" onClick={reload} disabled={loading}><RefreshCw size={17}/>Обновить</button></div>
    <div className="admin-stats">{sections.filter(s=>["account","task","profile","review"].includes(s.key)).map(s=><div key={s.key}><s.icon size={20}/><strong>{data ? (data.counts[s.key]??0) : "—"}</strong><span>{s.label}</span></div>)}</div>
    <nav className="admin-tabs" aria-label="Разделы админки">{sections.map(s=><button key={s.key} aria-current={kind===s.key?"page":undefined} onClick={()=>{setKind(s.key);setPage(1);setQuery("");setSearch("");setNotice("");}}><s.icon size={18}/>{s.label}</button>)}</nav>
    {kind==="report" && <AdminReports/>}<section hidden={kind==="report"} className="admin-content" aria-busy={loading}>
      <div className="admin-toolbar"><h2>{sections.find(s=>s.key===kind)?.label}</h2><form onSubmit={e=>{e.preventDefault();setSearch(query.trim());setPage(1);}} className="admin-search"><Search size={18}/><input aria-label="Поиск по разделу" placeholder="Имя, название или текст" value={query} onChange={e=>setQuery(e.target.value)} maxLength={120}/><button type="submit">Найти</button></form></div>
      {notice&&<p role="status" className="admin-notice">{notice}</p>}{error&&<p role="alert" className="admin-error">{error}</p>}
      {loading?<p className="admin-empty" role="status">Загрузка…</p>:!error&&<>
        {!data?.rows.length?<p className="admin-empty">{search?"Ничего не найдено. Попробуйте другой запрос.":"В этом разделе пока нет записей."}</p>:<div className="admin-list">{data.rows.map(row=><article key={row.id} className="admin-row">
          <div className="admin-row-body"><div className="admin-row-title"><h3>{row.title||row.name||"Запись"}</h3>{kind!=="audit"&&<span className={row.restricted?"admin-badge restricted":"admin-badge"}>{row.erased||row.deleted?"Удалено":row.restricted?(kind==="account"?"Заблокирован":"Скрыто"):kind==="account"?"Активен":"Опубликовано"}</span>}{row.self&&kind==="account"&&<span className="admin-badge">Ваш аккаунт</span>}</div>
            <p className="admin-meta">{[row.role&&(row.role==="customer"?"Заказчик":"Исполнитель"),row.city,state(row.status),row.rating&&`Оценка: ${row.rating}/5`,date(row.created)].filter(Boolean).join(" · ")}</p>
            {row.description&&<p className="admin-description">{row.description}</p>}{row.skills&&<p>Навыки: {row.skills}</p>}{row.portfolio&&<p className="admin-description">Портфолио: {row.portfolio}</p>}
            {kind==="audit"&&<><p><strong>{row.action==="delete"?"Удаление":row.action==="restore"?"Восстановление":"Ограничение"}</strong> · {sections.find(s=>s.key===row.targetKind)?.label}</p><p className="admin-description">Причина: {row.reason}</p><p className="admin-meta">Администратор: {row.actor}</p></>}
            <details><summary>Идентификатор записи</summary><code>{row.target||row.id}</code></details>
          </div>{kind!=="audit"&&<button className={row.restricted?"outline":"admin-restrict"} disabled={!!row.erased||(row.self&&kind==="account")} onClick={()=>{setDeleteMode(false);setConfirmation("");setSelected(row);setReason("");setBasis("");setActionError("");}}>{row.restricted?"Восстановить":kind==="account"?"Заблокировать":"Скрыть"}</button>}{["account","task"].includes(kind)&&<button className="admin-restrict" disabled={!!row.erased||!!row.deleted||(row.self&&kind==="account")} onClick={()=>{setDeleteMode(true);setConfirmation("");setSelected(row);setReason("");setBasis("");setActionError("");}}>Удалить</button>}
        </article>)}</div>}
        <div className="admin-pagination"><span>Всего: {data?.total??0}</span><div><button className="outline" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Назад</button><span>Страница {page} из {Math.max(1,Math.ceil((data?.total??0)/30))}</span><button className="outline" disabled={page*30>=(data?.total??0)} onClick={()=>setPage(p=>p+1)}>Далее</button></div></div>
      </>}
    </section>
    <Dialog open={!!selected} onOpenChange={open=>{if(!open&&!saving)setSelected(null);}}><DialogContent showCloseButton={false} lang="ru" className="admin-dialog"><DialogTitle>{deleteMode?(selected?.kind==="account"?"Удалить пользователя":"Удалить задание"):selected?.restricted?"Восстановить доступ":selected?.kind==="account"?"Заблокировать пользователя":"Скрыть публикацию"}</DialogTitle><DialogDescription>{deleteMode?(selected?.kind==="account"?"Профиль, публикации, отклики, отзывы, связанные диалоги и данные входа пользователя будут удалены. Восстановление невозможно. Сохранится отметка удаления и запись в журнале.":"Объявление исчезнет из каталога. Участники сохранят историю, переписку и отзывы."):selected?.restricted?"Запись снова станет доступна, если на неё не действуют другие ограничения.":selected?.kind==="account"?"Пользователь не сможет публиковать, откликаться и писать сообщения. Его публикации исчезнут из общего каталога.":"Публикация исчезнет из общего каталога. Запись сохранится, и её можно будет восстановить."}</DialogDescription><p><strong>{selected?.title||selected?.name}</strong></p><form onSubmit={save}><label htmlFor="admin-reason">Причина действия</label><textarea id="admin-reason" required minLength={3} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Укажите причину для журнала"/>{actionError&&<p role="alert" className="admin-error">{actionError}</p>}<label htmlFor="admin-basis">Правовое основание или пункт правил</label><input id="admin-basis" required minLength={5} maxLength={500} value={basis} onChange={e=>setBasis(e.target.value)}/>{deleteMode&&<label>Введите DELETE<input value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off" required pattern="DELETE"/></label>}<div className="admin-dialog-actions"><button className="outline" type="button" disabled={saving} onClick={()=>setSelected(null)}>Отмена</button><button className="dark" type="submit" disabled={saving||(deleteMode&&confirmation!=="DELETE")||reason.trim().length<3||basis.trim().length<5}>{saving?"Сохранение…":"Подтвердить"}</button></div></form></DialogContent></Dialog>
  </main>;
}
