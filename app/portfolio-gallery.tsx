"use client";
import {useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogClose} from '@/components/ui/dialog';
import {useLanguage} from './i18n/provider';

export function PortfolioGallery({images}:{images:string[]}) {
  const {t}=useLanguage();
  const [selected,setSelected]=useState<number|null>(null),[zoom,setZoom]=useState(false);
  const move=(delta:number)=>{setSelected(index=>index===null?null:(index+delta+images.length)%images.length);setZoom(false);};
  return <>
    <div className="portfolio-gallery">{images.map((src,index)=><button className="portfolio-thumbnail" type="button" key={index} aria-label={t('Увеличить фото {number}',{number:index+1})} onClick={()=>{setSelected(index);setZoom(false);}}><img src={src} alt={`${t('Работа')} ${index+1}`} loading="lazy"/></button>)}</div>
    <Dialog open={selected!==null} onOpenChange={open=>{if(!open){setSelected(null);setZoom(false);}}}>
      <DialogContent className="portfolio-viewer" showCloseButton={false} aria-describedby={undefined} onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();move(1);}if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}}}>
        <div className="portfolio-viewer-heading"><DialogTitle>{t('Портфолио')} · {(selected??0)+1} / {images.length}</DialogTitle><DialogClose className="outline">{t('Закрыть')}</DialogClose></div>
        {selected!==null&&<div className={'portfolio-viewer-image'+(zoom?' zoomed':'')}><img src={images[selected]} alt={`${t('Работа')} ${selected+1}`}/></div>}
        <div className="portfolio-viewer-controls"><button type="button" className="outline" disabled={images.length<2} onClick={()=>move(-1)}>{t('Предыдущее фото')}</button><button type="button" className="outline" aria-pressed={zoom} onClick={()=>setZoom(!zoom)}>{zoom?t('Уменьшить'):t('Увеличить')}</button><button type="button" className="outline" disabled={images.length<2} onClick={()=>move(1)}>{t('Следующее фото')}</button></div>
      </DialogContent>
    </Dialog>
  </>;
}
