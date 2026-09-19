import * as SecureStore from 'expo-secure-store';
const base = process.env.EXPO_PUBLIC_API_URL || 'https://gigs.lv/api';
let token: string | null = null;
export async function restoreToken() { token = await SecureStore.getItemAsync('gigs-session'); return token; }
export async function saveToken(value: string | null) {
  if(value) await SecureStore.setItemAsync('gigs-session',value); else await SecureStore.deleteItemAsync('gigs-session');
  token=value;
}
export class ApiError extends Error { constructor(message:string,public status:number){super(message);} }
export async function api<T>(path:string,body?:unknown):Promise<T> {
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try {
  const response=await fetch(base+path,{method:body===undefined?'GET':'POST',signal:controller.signal,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new ApiError(data.error||'Сервис временно недоступен.',response.status);
  return data;
 } catch(e){if(e instanceof ApiError)throw e;throw Error('Нет связи с сервером. Проверьте интернет и повторите попытку.');}finally{clearTimeout(timer);}
}
