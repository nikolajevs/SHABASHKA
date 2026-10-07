"use client";
import {MessageCircle,Search,Lock} from 'lucide-react';
import {useState} from 'react';
import {useLanguage,localeTags} from './i18n/provider';
type Entry={id:string;kind:string;parent?:string;name:string;title?:string;description?:string;created?:string;mine?:boolean;unread?:boolean;communicationBlocked?:boolean;chatHidden?:boolean};
export function Inbox({records,onOpen}:{records:Entry[];onOpen:(id:string)=>void}) {
 const {t,locale}=useLanguage(),[query,setQuery]=useState('');
 const threads=records.filter(r=>['conversation','bid'].includes(r.kind)&&!r.chatHidden).map(thread=>{
   const task=records.find(r=>r.id===thread.parent&&r.kind==='task');
   const name=thread.kind==='conversation'?thread.name:thread.mine?task?.name||t('Заказчик'):thread.name;
   const messages=records.filter(r=>r.kind==='message'&&r.parent===thread.id).sort((a,b)=>(b.created||'').localeCompare(a.created||''));
   return {thread,name,task,last:messages[0],unread:messages.filter(m=>m.unread).length};
 }).sort((a,b)=>(b.last?.created||b.thread.created||'').localeCompare(a.last?.created||a.thread.created||''))
 .filter(r=>(r.name+' '+(r.task?.title||'')+' '+(r.last?.description||'')).toLowerCase().includes(query.toLowerCase()));
 return <section className="inbox" aria-label={t('Сообщения')}>
   <label className="inbox-search"><Search size={18}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('Поиск диалога')} aria-label={t('Поиск диалога')}/></label>
   {!threads.length&&<div className="inbox-empty"><MessageCircle size={30}/><h3>{t('Диалогов пока нет')}</h3><p>{t('Напишите специалисту или откройте чат по отклику.')}</p></div>}
   <div className="inbox-list">{threads.map(({thread,name,task,last,unread})=><button className={'inbox-thread'+(unread?' unread':'')} key={thread.id} onClick={()=>onOpen(thread.id)}>
     <span className="inbox-avatar">{name.split(' ').map(s=>s[0]).slice(0,2).join('')}</span>
     <span className="inbox-summary"><strong>{name}</strong><small>{task?.title||t('Личный диалог')}{thread.communicationBlocked&&<> · <Lock size={12}/>{t('Переписка заблокирована')}</>}</small><span>{last?(last.mine?t('Вы')+': ':'')+(last.description||''):t('Начните переписку')}</span></span>
     <span className="inbox-meta">{last?.created&&<time dateTime={last.created}>{new Date(last.created).toLocaleDateString(localeTags[locale],{day:'numeric',month:'short',timeZone:'Europe/Riga'})}</time>}{unread>0&&<span className="unread-count">{unread}</span>}</span>
   </button>)}</div>
 </section>;
}
