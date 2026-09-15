"use client";
import {useLanguage} from '../i18n/provider';
import {legalCopy} from './content';
export default function LegalDocument({document}:{document:'terms'|'privacy'|'cookies'}){const{locale}=useLanguage();const copy=legalCopy[locale],content=copy[document];return <><h1>{content.title}</h1><p>{copy.updated}</p><aside className="draft-banner">{copy.draft}</aside><p>{copy.operator}</p>{content.sections.map(([title,text])=><section key={title}><h2>{title}</h2><p>{text}</p></section>)}</>;}
