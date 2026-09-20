"use client";
import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {LanguageSwitcher,useLanguage} from './i18n/provider';
import './auth.css';
type Mode='login'|'register'|'forgot'|'reset'|'verify';
type Config={google:boolean;email:boolean;user:{email:string;emailVerified:boolean;provider:string}|null};
export async function authRequest(action:string,data:Record<string,unknown>,locale:string) {
  if(action==='logout'&&'serviceWorker'in navigator){
    const registration=await navigator.serviceWorker.getRegistration('/push-sw.js');
    const subscription=await registration?.pushManager.getSubscription();
    if(subscription){
      const removed=await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove',subscription:subscription.toJSON()})});
      if(removed.ok)await subscription.unsubscribe();
    }
  }
  const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json','X-SHABASHKA-Language':locale},body:JSON.stringify({action,...data})});
  const b=await r.json() as {errorKey?:string;message?:string;ok?:boolean};if(!r.ok)throw Error(b.errorKey||'Не удалось сохранить. Попробуйте ещё раз.');return b;
}
function signInTarget() {
  const target=new URLSearchParams(location.search).get('returnTo');
  return target&&['/admin','/privacy'].includes(target)?target:'/?auth=complete';
}
function signedIn(){location.assign(signInTarget());}
export function AuthPanel({initialMode='login',token='',onSuccess=signedIn}:{initialMode?:Mode;token?:string;onSuccess?:()=>void}) {
  const {t,errorText,locale}=useLanguage(),[mode,setMode]=useState<Mode>(initialMode),[config,setConfig]=useState<Config|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  useEffect(()=>{let active=true;fetch('/api/auth',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<Config>;}).then(d=>{if(active)setConfig(d);}).catch(()=>{if(active)setError('Не удалось загрузить данные. Попробуйте ещё раз.');});return()=>{active=false;};},[]);
  function switchMode(next:Mode){setMode(next);setError('');setMessage('');}
  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();if(busy)return;setError('');setMessage('');
    const values=Object.fromEntries(new FormData(e.currentTarget));
    if((mode==='register'||mode==='reset')&&values.password!==values.repeat){setError('Пароли не совпадают.');return;}
    setBusy(true);
    try{const result=await authRequest(mode,{...values,token},locale);if(mode==='login'||mode==='register')onSuccess();else setMessage(result.message||"");}
    catch(e){setError(e instanceof Error?e.message:'Не удалось сохранить. Попробуйте ещё раз.');}finally{setBusy(false);}
  }
  useEffect(()=>{if(new URLSearchParams(location.search).get('authError'))setError('Не удалось войти. Попробуйте ещё раз.');},[]);
  async function chatGPT(){setBusy(true);setError('');try{await authRequest('chatgpt',{},locale);location.assign('/signin-with-chatgpt?return_to='+encodeURIComponent(signInTarget()));}catch(e){setError(e instanceof Error?e.message:'Не удалось войти. Попробуйте ещё раз.');setBusy(false);}}
  return <div className="auth-panel">
    {['login','register'].includes(mode)&&<div className="auth-tabs"><button type="button" aria-pressed={mode==='login'} onClick={()=>switchMode('login')}>{t('Вход')}</button><button type="button" aria-pressed={mode==='register'} onClick={()=>switchMode('register')}>{t('Регистрация')}</button></div>}
    <h2>{t(mode==='login'?'Вход':mode==='register'?'Регистрация':mode==='forgot'?'Восстановление пароля':mode==='reset'?'Новый пароль':'Подтверждение email')}</h2>
    {error&&<p className="auth-error" role="alert">{errorText(error)}</p>}{message&&<p className="auth-message" role="status">{t(message)}</p>}
    {!(message&&['reset','verify','forgot'].includes(mode))&&<form onSubmit={submit} className="auth-form">
      {mode==='register'&&<label>{t('Ваше имя')}<input name="name" autoComplete="name" required maxLength={80}/></label>}
      {['login','register','forgot'].includes(mode)&&<label>{t('Email')}<input type="email" name="email" autoComplete="username" required maxLength={254}/></label>}
      {['login','register','reset','verify'].includes(mode)&&<label>{t(mode==='reset'?'Новый пароль':'Пароль')}<input type="password" name="password" autoComplete={mode==='login'||mode==='verify'?'current-password':'new-password'} required minLength={mode==='login'?1:12} maxLength={128}/></label>}
      {['register','reset'].includes(mode)&&<><p className="auth-hint">{t('От 12 до 128 символов. Используйте уникальный пароль.')}</p><label>{t('Повторите пароль')}<input type="password" name="repeat" autoComplete="new-password" minLength={12} maxLength={128} required/></label></>}
      {mode==='register'&&<p className="auth-hint">{t('Email используется как логин. Роль и условия использования вы выберете на следующем шаге.')}</p>}
      {mode==='forgot'&&config&&!config.email&&<p className="auth-hint">{t('Отправка писем пока недоступна.')}</p>}
      <button className="primary" type="submit" disabled={busy||(mode==='forgot'&&!config?.email)}>{busy?t('Сохранение…'):t(mode==='login'?'Войти':mode==='register'?'Зарегистрироваться':mode==='forgot'?'Отправить ссылку':mode==='reset'?'Сохранить пароль':'Подтвердить email')}</button>
    </form>}
    {mode==='login'&&<button type="button" className="auth-link" onClick={()=>switchMode('forgot')}>{t('Забыли пароль?')}</button>}
    {['login','register'].includes(mode)&&<><div className="auth-divider">{t('или')}</div><div className="auth-social"><a className="outline" href={config?.google?'/api/auth/google':undefined} aria-disabled={!config?.google}>{t('Войти через Google')}</a><button className="outline" type="button" disabled={busy} onClick={chatGPT}>{t('Войти через ChatGPT')}</button></div>{config&&!config.google&&<p className="auth-hint">{t('Вход через Google скоро появится.')}</p>}</>}
    {!['login','register'].includes(mode)&&<button type="button" className="auth-link" onClick={()=>switchMode('login')}>{t('Вернуться ко входу')}</button>}
  </div>;
}
export function AuthDialog({open,onClose}:{open:boolean;onClose:()=>void}) {const{t}=useLanguage();return <Dialog open={open} onOpenChange={v=>{if(!v)onClose();}}><DialogContent className="auth-dialog"><LanguageSwitcher/><DialogTitle>{t('Добро пожаловать в Gigs')}</DialogTitle><DialogDescription>{t('Войдите или создайте аккаунт, чтобы продолжить.')}</DialogDescription><AuthPanel/></DialogContent></Dialog>;}
export function AuthEntry(){const[open,setOpen]=useState(false),{t}=useLanguage();return <><button type="button" className="dark" onClick={()=>setOpen(true)}>{t('Войти')}</button><AuthDialog open={open} onClose={()=>setOpen(false)}/></>;}
export function AuthLogout(){const{t,locale,errorText}=useLanguage(),[busy,setBusy]=useState(false),[error,setError]=useState('');return <span className="logout-action"><button type="button" className="auth-link" disabled={busy} onClick={async()=>{setBusy(true);try{await authRequest('logout',{},locale);location.assign('/signout-with-chatgpt?return_to=/');}catch(e){setError(errorText(e instanceof Error?e.message:''));setBusy(false);}}}>{t('Выйти')}</button>{error&&<span role="alert">{error}</span>}</span>;}
export function EmailVerification(){const{t,locale,errorText}=useLanguage(),[config,setConfig]=useState<Config|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);useEffect(()=>{fetch('/api/auth').then(r=>r.json() as Promise<Config>).then(setConfig).catch(()=>{});},[]);if(!config?.user||config.user.provider!=='password'||config.user.emailVerified)return null;return <div className="auth-verification"><p>{t('Подтвердите email, чтобы защитить свой аккаунт.')}</p>{config.email?<button className="outline" disabled={busy} onClick={async()=>{setBusy(true);try{const b=await authRequest('send-verification',{},locale);setMessage(t(b.message));}catch(e){setMessage(errorText(e instanceof Error?e.message:''));}finally{setBusy(false);}}}>{t('Отправить письмо подтверждения')}</button>:<p>{t('Отправка писем пока недоступна.')}</p>}{message&&<p role="status">{message}</p>}</div>;}
export function AuthTokenPage({mode}:{mode:'reset'|'verify'}) {const[token,setToken]=useState('');useEffect(()=>{if(location.hash){setToken(location.hash.slice(1));history.replaceState(null,'',location.pathname);}},[]);return <AuthPanel initialMode={mode} token={token}/>;}
