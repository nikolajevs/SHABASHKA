"use client";
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLanguage} from './i18n/provider';
export function NotificationSettings({eventIds,container}:{eventIds:string[];container:HTMLElement|null}){
  const {t,locale}=useLanguage();
  const [sound,setSound]=useState(false),[push,setPush]=useState(false),[supported,setSupported]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const audio=useRef<AudioContext|null>(null),seen=useRef<Set<string>|null>(null);
  async function beep(){
    try{const ctx=audio.current??(audio.current=new AudioContext());await ctx.resume();const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.connect(gain);gain.connect(ctx.destination);oscillator.frequency.value=740;gain.gain.setValueAtTime(.09,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.22);oscillator.start();oscillator.stop(ctx.currentTime+.23);}catch{}
  }
  useEffect(()=>{
    try{setSound(localStorage.getItem('gigs-sound')==='on');}catch{}
    setSupported('serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window);
    if('serviceWorker'in navigator)navigator.serviceWorker.getRegistration('/push-sw.js').then(r=>r?.pushManager.getSubscription()).then(s=>setPush(!!s)).catch(()=>{});
    return()=>{audio.current?.close();};
  },[]);
  useEffect(()=>{
    if(!sound)return;
    const unlock=()=>{try{const ctx=audio.current??(audio.current=new AudioContext());void ctx.resume();}catch{}};
    window.addEventListener('pointerdown',unlock);return()=>window.removeEventListener('pointerdown',unlock);
  },[sound]);
  useEffect(()=>{
    const fresh=seen.current&&eventIds.some(id=>!seen.current!.has(id));
    seen.current=new Set(eventIds);
    if(fresh&&sound&&document.visibilityState==='visible')void beep();
  },[eventIds.join('|'),sound]);
  async function togglePush(){
    setBusy(true);setError('');
    try{
      if(!push&&await Notification.requestPermission()!=='granted')throw Error('Разрешите уведомления в настройках браузера.');
      const registration=await navigator.serviceWorker.register('/push-sw.js');
      await navigator.serviceWorker.ready;
      let subscription=await registration.pushManager.getSubscription();
      if(!push&&!subscription){const response=await fetch('/api/push');const {publicKey}=await response.json() as {publicKey:string|null};if(!publicKey)throw Error('Push пока недоступен.');const key=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});}
      if(subscription){const result=await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:push?'remove':'subscribe',subscription:subscription.toJSON(),locale})});if(!result.ok)throw Error('Не удалось сохранить. Попробуйте ещё раз.');if(push)await subscription.unsubscribe();}
      setPush(!push);
    }catch(e){setError(t(e instanceof Error?e.message:'Не удалось сохранить. Попробуйте ещё раз.'));}finally{setBusy(false);}
  }
  return container?createPortal(<div className="notification-settings">
    <button className="outline" aria-pressed={sound} onClick={()=>{const next=!sound;setSound(next);try{localStorage.setItem('gigs-sound',next?'on':'off');}catch{}if(next)void beep();}}>{t(sound?'Выключить звук':'Включить звук')}</button>
    <button className="outline" disabled={!supported||busy} aria-pressed={push} onClick={()=>void togglePush()}>{t(push?'Отключить push':'Включить push')}</button>
    <small>{t('На iPhone добавьте сайт на домашний экран. Звук push задаётся настройками устройства.')}</small>
    {error&&<p role="alert">{error}</p>}
  </div>,container):null;
}
