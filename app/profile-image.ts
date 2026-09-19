// Resize uploads before storing them, keeping the complete profile below the row limit.
export async function prepareProfileImage(file: File): Promise<string> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 20*1024*1024) throw Error('Изображение слишком большое или имеет неподдерживаемый формат');
  const url=URL.createObjectURL(file);
  try {
    const img=new Image();img.src=url;await img.decode();
    const canvas=document.createElement('canvas');
    let size=1000;
    for(let attempt=0;attempt<6;attempt++) {
      const scale=Math.min(1,size/Math.max(img.naturalWidth,img.naturalHeight));
      canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      const ctx=canvas.getContext('2d');if(!ctx)throw Error();
      ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const result=canvas.toDataURL('image/jpeg',0.8);
      if(result.length<=140000)return result;
      size=Math.round(size*0.75);
    }
    throw Error();
  } catch {throw Error('Изображение слишком большое или имеет неподдерживаемый формат');}
  finally {URL.revokeObjectURL(url);}
}
