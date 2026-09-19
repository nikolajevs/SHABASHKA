import { useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const dateLabel = (value: string) => value.split('-').reverse().join('.');
const asDate = (value: string) => new Date(value + 'T12:00:00');
const control = {backgroundColor:'#e9efdf',padding:14,borderRadius:12} as const;

export function DateRange({from,to,onChange,disabled}:{from:string;to:string;onChange:(from:string,to:string)=>void;disabled:boolean}) {
  const [picker,setPicker]=useState<'from'|'to'|null>(null);
  const minimum=picker==='to'&&from?asDate(from):new Date();
  return <View style={{gap:10}}><Text style={{fontWeight:'600'}}>Желаемые даты</Text>
    <View style={{flexDirection:'row',gap:12}}>
      <Pressable accessibilityRole="button" disabled={disabled} style={[control,{flex:1}]} onPress={()=>setPicker('from')}><Text>От: {from?dateLabel(from):'Выбрать'}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={disabled} style={[control,{flex:1}]} onPress={()=>setPicker('to')}><Text>До: {to?dateLabel(to):'Выбрать'}</Text></Pressable>
    </View>
    {picker&&<DateTimePicker mode="date" value={asDate((picker==='from'?from:to)||dateKey(minimum))} minimumDate={minimum} onChange={(event,date)=>{
      if(Platform.OS==='android')setPicker(null);
      if(event.type!=='set'||!date)return;
      const key=dateKey(date);
      if(picker==='from')onChange(key,to&&to>=key?to:key);else onChange(from||key,key);
    }}/>}
    {picker&&Platform.OS==='ios'&&<Pressable style={control} onPress={()=>setPicker(null)}><Text>Готово</Text></Pressable>}
  </View>;
}

export async function pickOrderPhotos(remaining:number):Promise<string[]> {
  if(remaining<=0)return [];
  const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:true,selectionLimit:remaining});
  if(result.canceled)return [];
  const photos:string[]=[];
  for(const asset of result.assets.slice(0,remaining)) {
    let data='';
    for(const size of [1100,850,600,400]) {
      const image=await manipulateAsync(asset.uri,[{resize:asset.width>=asset.height?{width:Math.min(size,asset.width)}:{height:Math.min(size,asset.height)}}],{format:SaveFormat.JPEG,compress:0.65,base64:true});
      data='data:image/jpeg;base64,'+image.base64;
      if(image.base64&&data.length<=180000)break;
    }
    if(data.length>180000)throw Error('Фото слишком большое. Выберите другое изображение.');
    photos.push(data);
  }
  return photos;
}

export function Photos({photos,onRemove,disabled=false}:{photos:string[];onRemove?:(index:number)=>void;disabled?:boolean}) {
  const [selected,setSelected]=useState<string|null>(null);
  return <><ScrollView horizontal contentContainerStyle={{gap:10}}>{photos.map((uri,index)=><View key={index} style={{gap:5}}>
    <Pressable accessibilityLabel={`Открыть фото ${index+1}`} onPress={()=>setSelected(uri)}><Image source={{uri}} style={{width:90,height:90,borderRadius:10}}/></Pressable>
    {onRemove&&<Pressable disabled={disabled} accessibilityLabel={`Удалить фото ${index+1}`} onPress={()=>onRemove(index)} style={{padding:8}}><Text>Удалить</Text></Pressable>}
  </View>)}</ScrollView><Modal visible={!!selected} onRequestClose={()=>setSelected(null)}><View style={{flex:1,backgroundColor:'#152019',padding:24,paddingTop:60}}><Pressable style={control} onPress={()=>setSelected(null)}><Text>Закрыть</Text></Pressable>{selected&&<Image source={{uri:selected}} resizeMode="contain" style={{flex:1}}/>}</View></Modal></>;
}
