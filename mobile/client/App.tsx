import { StatusBar } from 'expo-status-bar';
import * as Crypto from 'expo-crypto';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { api, ApiError, restoreToken, saveToken } from './api';
import { DateRange, Photos, pickOrderPhotos, dateKey, dateLabel } from './order-fields';
import type { Order } from '../shared/types';
type User={name:string;email:string};
export default function App(){
 const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false);
 const [mode,setMode]=useState<'login'|'register'|'forgot'>('login'),[tab,setTab]=useState<'create'|'orders'>('create');
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[accepted,setAccepted]=useState(false);
 const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[address,setAddress]=useState(''),[dateFrom,setDateFrom]=useState(''),[dateTo,setDateTo]=useState('');
 const [photos,setPhotos]=useState<string[]>([]);
 const [requestId,setRequestId]=useState(()=>Crypto.randomUUID()),[orders,setOrders]=useState<Order[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{(async()=>{try{if(await restoreToken())setUser((await api<{user:User}>('/mobile/auth')).user);}catch(e){if(e instanceof ApiError&&e.status===401)await saveToken(null);else setError(e instanceof Error?e.message:'Не удалось восстановить вход.');}finally{setReady(true);}})();},[]);
 async function run(action:()=>Promise<void>){if(busy)return;setBusy(true);setError('');setNotice('');try{await action();}catch(e){if(e instanceof ApiError&&e.status===401){await saveToken(null);setUser(null);}setError(e instanceof Error?e.message:'Не удалось выполнить действие.');}finally{setBusy(false);}}
 async function authenticate(){await run(async()=>{
  if(!email.trim())throw Error('Укажите email.');
  if(mode==='register'&&(!name.trim()||password.length<12||password!==confirmation||!accepted))throw Error('Укажите имя, пароль от 12 символов, подтвердите пароль и примите условия.');
  if(mode==='forgot'){const result=await api<{message:string}>('/mobile/auth',{action:'forgot',email});setNotice(result.message);return;}
  const result=await api<{token:string;user:User}>('/mobile/auth',{action:mode,name,email,password,acceptTerms:accepted});
  await saveToken(result.token);setUser(result.user);setPassword('');setConfirmation('');
 });}
 async function loadOrders(){setOrders(await api<Order[]>('/mobile/client/orders'));}
 function clearOrder(){setTitle('');setDescription('');setAddress('');setDateFrom('');setDateTo('');setPhotos([]);setRequestId(Crypto.randomUUID());}
 async function submit(){await run(async()=>{
  if(![title,description,address,dateFrom,dateTo].every(v=>v.trim()))throw Error('Заполните все поля заказа.');
  if(dateTo<dateFrom||dateFrom<dateKey(new Date()))throw Error('Выберите корректный диапазон дат, начиная с сегодняшнего дня.');
  const order=await api<Order>('/mobile/client/orders',{title,description,address,dateFrom,dateTo,photos,requestId});
  setOrders(current=>[order,...current.filter(item=>item.id!==order.id)]);clearOrder();setTab('orders');setNotice('Заказ создан.');
 });}
 const button=(label:string,onPress:()=>void,secondary=false)=><Pressable accessibilityRole="button" disabled={busy} onPress={onPress} style={[styles.button,secondary&&styles.secondary,busy&&{opacity:0.5}]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
 const field=(label:string,value:string,onChangeText:(v:string)=>void,options:Record<string,unknown>={})=><View style={{gap:7}}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} style={styles.input} editable={!busy} {...options}/></View>;
 if(!ready)return <SafeAreaView style={styles.safe}><ActivityIndicator size="large"/></SafeAreaView>;
 return <SafeAreaView style={styles.safe}><StatusBar style="dark"/><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
 <Text style={styles.brand}>Gigs</Text>
 {!user?<>
 <Text style={styles.heading}>{mode==='register'?'Создать аккаунт':mode==='forgot'?'Восстановить пароль':'Добро пожаловать'}</Text>
 <Text style={styles.muted}>Войдите с email и паролем от сайта Gigs или создайте аккаунт.</Text>
 {mode==='register'&&field('Имя',name,setName,{maxLength:80,autoComplete:'name'})}
 {field('Email',email,setEmail,{keyboardType:'email-address',autoCapitalize:'none',autoCorrect:false,autoComplete:'email',maxLength:254})}
 {mode!=='forgot'&&field('Пароль',password,setPassword,{secureTextEntry:true,autoCapitalize:'none',maxLength:128})}
 {mode==='register'&&<>{field('Повторите пароль',confirmation,setConfirmation,{secureTextEntry:true,maxLength:128})}<View style={styles.row}><Switch value={accepted} onValueChange={setAccepted} disabled={busy} accessibilityLabel="Принять условия"/><Text style={{flex:1}}>Я принимаю условия использования</Text></View><Text style={styles.link} onPress={()=>Linking.openURL('https://gigs.lv/legal/terms')}>Условия использования</Text><Text style={styles.link} onPress={()=>Linking.openURL('https://gigs.lv/legal/privacy')}>Политика конфиденциальности</Text></>}
 {button(mode==='register'?'Зарегистрироваться':mode==='forgot'?'Отправить ссылку':'Войти',authenticate)}
 {button(mode==='login'?'Создать аккаунт':'Вернуться ко входу',()=>{setMode(mode==='login'?'register':'login');setError('');setNotice('');},true)}
 {mode==='login'&&button('Забыли пароль?',()=>{setMode('forgot');setError('');},true)}
 </>:<>
 <Text style={styles.heading}>Здравствуйте, {user.name}</Text>
 <View style={styles.row}>{button('Новый заказ',()=>{setTab('create');setError('');},tab!=='create')}{button('Мои заказы',()=>{setTab('orders');void run(loadOrders);},tab!=='orders')}</View>
 {tab==='create'?<><Text style={styles.heading}>Что нужно сделать?</Text>
 {field('Название заказа',title,setTitle,{maxLength:120})}{field('Описание',description,setDescription,{multiline:true,maxLength:4000})}<Text style={styles.label}>Фото к заказу ({photos.length}/5)</Text><Photos photos={photos} disabled={busy} onRemove={index=>setPhotos(current=>current.filter((_,i)=>i!==index))}/>{photos.length<5&&button('Добавить фото',()=>void run(async()=>{const added=await pickOrderPhotos(5-photos.length);setPhotos(current=>[...current,...added].slice(0,5));}),true)}{field('Адрес в Латвии',address,setAddress,{maxLength:500})}<DateRange from={dateFrom} to={dateTo} disabled={busy} onChange={(from,to)=>{setDateFrom(from);setDateTo(to);}}/>{button('Создать заказ',submit)}
 </>:<>{button('Обновить заказы',()=>void run(loadOrders),true)}{!orders.length&&!busy&&<Text style={styles.muted}>У вас пока нет заказов.</Text>}{orders.map(order=><View key={order.id} style={styles.card}><Text style={styles.title}>{order.title}</Text><Text style={styles.badge}>{({new:'Новый',accepted:'Принят',on_the_way:'В пути',in_progress:'Выполняется',completed:'Завершён',cancelled:'Отменён'})[order.status]||order.status}</Text><Text>{order.description}</Text><Text style={styles.muted}>{order.address}</Text><Text style={styles.muted}>{order.dateFrom&&order.dateTo?dateLabel(order.dateFrom)+' — '+dateLabel(order.dateTo):order.scheduledAt}</Text>{!!order.photos?.length&&<Photos photos={order.photos}/>}</View>)}</>}
 {button('Выйти',()=>void run(async()=>{await api('/mobile/auth',{action:'logout'});await saveToken(null);setUser(null);setOrders([]);clearOrder();}),true)}
 </>}
 {busy&&<ActivityIndicator/>}{!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}{!!notice&&<Text style={styles.notice}>{notice}</Text>}
 </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#f8faf5',paddingTop:Platform.OS==='android'?30:0},container:{padding:24,gap:16,paddingBottom:50},brand:{fontSize:34,fontWeight:'800',color:'#314c2f'},heading:{fontSize:25,fontWeight:'700',color:'#18281a'},muted:{color:'#52634c',lineHeight:22},label:{fontSize:15,fontWeight:'600'},input:{backgroundColor:'#fff',borderWidth:1,borderColor:'#b9c9b0',borderRadius:12,padding:14,fontSize:16,minHeight:50,color:'#17251a'},button:{backgroundColor:'#caff38',borderRadius:12,padding:15,alignItems:'center'},buttonText:{fontSize:15,fontWeight:'700',color:'#17251a'},secondary:{backgroundColor:'#e9efdf'},row:{flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap'},card:{backgroundColor:'#fff',borderWidth:1,borderColor:'#dce6d7',borderRadius:16,padding:18,gap:10},title:{fontSize:19,fontWeight:'700'},badge:{color:'#315b3d',fontWeight:'600'},link:{color:'#315b3d',textDecorationLine:'underline'},error:{color:'#962d24',backgroundColor:'#fff0ea',padding:14,borderRadius:10},notice:{color:'#315b3d',backgroundColor:'#e8f2df',padding:14,borderRadius:10}});
