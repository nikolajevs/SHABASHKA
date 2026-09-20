"use client";
import {useEffect,useState} from 'react';
import {Bell,MessageCircle} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useLanguage} from './i18n/provider';
type Entry={id:string;kind:string;parent?:string;name:string;title?:string;created?:string;unread?:boolean;mine?:boolean};
export function Notifications({records,activeId,activeKind,onOpen,onRead}:{records:Entry[];activeId?:string;activeKind:string;onOpen:(kind:string,id:string)=>void;onRead:(ids:string[])=>void}) {
  const {t,locale}=useLanguage();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const incoming=records.filter(r=>(r.kind==='message'||r.kind==='bid')&&!r.mine);
  async function mark(ids:string[]) {
    if(!ids.length||busy)return;
    setBusy(true);setError('');
    try {
      for(let offset=0;offset<ids.length;offset+=200){
        const chunk=ids.slice(offset,offset+200);
        const response=await fetch('/api/market',{method:'POST',headers:{'Content-Type':'application/json','X-SHABASHKA-Language':locale},body:JSON.stringify({action:'read-notifications',ids:chunk})});
        if(!response.ok)throw Error();
        onRead(chunk);
      }
    }catch{setError(t('Не удалось сохранить. Попробуйте ещё раз.'));}finally{setBusy(false);}
  }
  const activeUnread=incoming.filter(r=>r.unread&&r.parent===activeId&&((activeKind==='chat'&&r.kind==='message')||(activeKind==='detail'&&r.kind==='bid'))).map(r=>r.id);
  const activeKey=activeUnread.join('|');
  useEffect(()=>{
    const readVisible=()=>{if(document.visibilityState==='visible'&&document.hasFocus())void mark(activeUnread);};
    readVisible();window.addEventListener('focus',readVisible);document.addEventListener('visibilitychange',readVisible);
    return()=>{window.removeEventListener('focus',readVisible);document.removeEventListener('visibilitychange',readVisible);};
  },[activeKey,activeKind,activeId]);
  const groups=new Map<string,Entry[]>();
  for(const item of incoming){const key=item.kind+':'+item.parent;groups.set(key,[...(groups.get(key)||[]),item]);}
  const grouped=[...groups.values()].sort((a,b)=>Number(b.some(r=>r.unread))-Number(a.some(r=>r.unread))||(b[0].created||'').localeCompare(a[0].created||''));
  const unread=incoming.filter(r=>r.unread).length;
  return <>
    <button className="notification-bell" aria-label={`${t('Уведомления')}: ${unread}`} onClick={()=>setOpen(true)}><Bell size={21}/>{unread>0&&<span>{unread>99?'99+':unread}</span>}</button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="notification-dialog"><DialogTitle>{t('Уведомления')}</DialogTitle><DialogDescription>{t('Новые отклики и сообщения')}</DialogDescription>
      {error&&<p role="alert">{error}</p>}
      <button className="outline" disabled={busy||!unread} onClick={()=>void mark(incoming.filter(r=>r.unread).map(r=>r.id))}>{t('Прочитать всё')}</button>
      {!grouped.length&&<p>{t('Уведомлений пока нет')}</p>}
      <div className="notification-list">{grouped.map(group=>{
        const item=group[0],target=records.find(r=>r.id===item.parent),task=item.kind==='message'?records.find(r=>r.id===target?.parent):target;
        const count=group.filter(r=>r.unread).length;
        return <button key={item.kind+item.parent} className={'notification-item'+(count?' unread':'')} disabled={!target||busy} onClick={()=>{onOpen(item.kind==='message'?'chat':'detail',item.parent!);setOpen(false);void mark(group.filter(r=>r.unread).map(r=>r.id));}}>
          <MessageCircle size={19}/><span><strong>{t(item.kind==='message'?'Сообщения':'Отклики')}{count>0?` · ${count}`:''}</strong><span>{task?.title||t('Задание недоступно')}</span><small>{item.name}</small></span>{count>0&&<i aria-label={t('Непрочитанное')}/>}
        </button>;
      })}</div>
    </DialogContent></Dialog>
  </>;
}
