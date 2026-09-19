import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { LATVIA_CITIES, ORDER_CATEGORIES, type OrderPoint } from '../shared/order-catalog';

export function CategoryField({value,onChange,disabled}:{value:string;onChange:(v:string)=>void;disabled:boolean}) {
  const [open,setOpen]=useState(false);
  return <View style={{gap:8}}><Text style={s.label}>Категория заказа</Text>
    <Pressable disabled={disabled} accessibilityRole="button" style={s.input} onPress={()=>setOpen(!open)}><Text>{value||'Выберите категорию'} ▾</Text></Pressable>
    {open&&ORDER_CATEGORIES.map(category=><Pressable disabled={disabled} accessibilityRole="radio" accessibilityState={{checked:value===category}} key={category} style={[s.choice,value===category&&s.selected]} onPress={()=>{onChange(category);setOpen(false);}}><Text>{category}</Text></Pressable>)}
  </View>;
}

const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function AddressFields({city,street,point,onChange,disabled}:{city:string;street:string;point:OrderPoint|null;onChange:(city:string,street:string,point:OrderPoint|null)=>void;disabled:boolean}) {
  const [suggest,setSuggest]=useState(false),[open,setOpen]=useState(false),[draft,setDraft]=useState<OrderPoint|null>(null),[working,setWorking]=useState(false),[error,setError]=useState('');
  const map=useRef<MapView>(null);
  const hits=LATVIA_CITIES.filter(c=>normalize(c.ru).includes(normalize(city))||normalize(c.lv).includes(normalize(city))).slice(0,8);
  const centre=point||{latitude:56.9496,longitude:24.1052};
  function choose(p:OrderPoint){setDraft(p);setError('');}
  async function locate(){
    setWorking(true);setError('');
    try {
      if(!(await Location.requestForegroundPermissionsAsync()).granted)throw Error('Разрешение не предоставлено. Выберите место нажатием на карту.');
      const position=await Promise.race([Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced}),new Promise<never>((_,reject)=>setTimeout(()=>reject(Error('Не удалось определить местоположение. Отметьте точку вручную.')),15000))]);
      const p={latitude:position.coords.latitude,longitude:position.coords.longitude};choose(p);map.current?.animateToRegion({...p,latitudeDelta:0.02,longitudeDelta:0.02});
    }catch(e){setError(e instanceof Error?e.message:'Не удалось определить местоположение.');}finally{setWorking(false);}
  }
  return <View style={{gap:10}}>
    <Text style={s.label}>Где выполнить заказ?</Text>
    <Text>Город или населённый пункт</Text>
    <TextInput accessibilityLabel="Город или населённый пункт" style={s.input} value={city} editable={!disabled} maxLength={100} placeholder="Начните вводить: Рига / Rīga" onFocus={()=>setSuggest(true)} onChangeText={v=>{onChange(v,street,null);setSuggest(true);}}/>
    {suggest&&<View style={s.suggestions}>{hits.map(c=><Pressable disabled={disabled} key={c.lv} style={s.choice} onPress={()=>{onChange(c.ru,street,null);setSuggest(false);}}><Text>{c.ru} · {c.lv}</Text></Pressable>)}<Pressable disabled={disabled} style={s.choice} onPress={()=>setSuggest(false)}><Text>{city.trim()?'Использовать введённый населённый пункт':'Закрыть список'}</Text></Pressable></View>}
    <Text>Улица, дом, квартира</Text>
    <TextInput accessibilityLabel="Улица, дом, квартира" style={s.input} value={street} editable={!disabled} maxLength={300} placeholder="Например: Brīvības iela 10, кв. 5" onChangeText={v=>onChange(city,v,null)}/>
    <Pressable disabled={disabled} accessibilityRole="button" style={s.button} onPress={()=>{setDraft(point);setError('');setOpen(true);setSuggest(false);}}><Text>{point?'Изменить точку на карте':'Отметить на карте'}</Text></Pressable>
    <Text style={s.hint}>Укажите улицу и дом или отметьте точку на карте. Название населённого пункта можно ввести вручную.</Text>
    {point&&<View style={{gap:8}}><Text>Точка выбрана: {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</Text><Pressable disabled={disabled} onPress={()=>onChange(city,street,null)}><Text style={{textDecorationLine:'underline'}}>Убрать точку</Text></Pressable></View>}
    <Modal visible={open} onRequestClose={()=>{if(!working)setOpen(false);}} animationType="slide">
      <SafeAreaView style={s.screen}><View style={s.top}><Text style={s.label}>Отметьте место выполнения заказа</Text><Text>Нажмите на карту или перетащите метку.</Text></View>
        {open&&<MapView ref={map} style={{flex:1}} initialRegion={{...centre,latitudeDelta:point?0.02:0.3,longitudeDelta:point?0.02:0.3}} onPress={e=>choose(e.nativeEvent.coordinate)}>
          {draft&&<Marker coordinate={draft} draggable onDragEnd={e=>choose(e.nativeEvent.coordinate)}/>}
        </MapView>}
        <View style={s.top}>{working&&<ActivityIndicator/>}{!!error&&<Text accessibilityRole="alert" style={{color:'#962d24'}}>{error}</Text>}
          <Pressable disabled={working} style={s.button} onPress={locate}><Text>Моё местоположение</Text></Pressable>
          <Pressable disabled={!draft||working} style={[s.button,s.selected,(!draft||working)&&{opacity:0.4}]} onPress={()=>{onChange(city,street,draft);setOpen(false);}}><Text>Подтвердить точку</Text></Pressable>
          <Pressable disabled={working} style={s.button} onPress={()=>setOpen(false)}><Text>Отмена</Text></Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  </View>;
}
const s=StyleSheet.create({label:{fontSize:16,fontWeight:'600'},input:{borderWidth:1,borderColor:'#b9c9b0',borderRadius:12,padding:14,fontSize:16,backgroundColor:'#fff',color:'#17251a'},choice:{padding:12,minHeight:44},suggestions:{borderWidth:1,borderColor:'#dce6d7',borderRadius:12,backgroundColor:'#fff'},button:{padding:14,backgroundColor:'#e9efdf',borderRadius:12,alignItems:'center'},selected:{backgroundColor:'#caff38',borderRadius:10},hint:{fontSize:13,color:'#52634c',lineHeight:19},screen:{flex:1,backgroundColor:'#f8faf5',paddingTop:30},top:{padding:16,gap:10}});
