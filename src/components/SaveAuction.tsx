'use client'
import { useEffect,useState } from 'react'
import { Heart } from 'lucide-react'
export type SavedCar={lot:string;site:string;title:string}
export const savedKey='koa-saved-auctions'
export function readSaved():SavedCar[]{try{const data=JSON.parse(localStorage.getItem(savedKey)||'[]');return Array.isArray(data)?data.filter(x=>x&&/^\d+$/.test(x.lot)&&['1','2'].includes(x.site)&&typeof x.title==='string').slice(0,100):[]}catch{return []}}
export function SaveAuction({lot,site,title}:SavedCar){const [saved,setSaved]=useState(false);useEffect(()=>{const update=()=>setSaved(readSaved().some(c=>c.lot===lot&&c.site===site));update();window.addEventListener('koa-saved',update);window.addEventListener('storage',update);return()=>{window.removeEventListener('koa-saved',update);window.removeEventListener('storage',update)}},[lot,site]);return <button className={`save-auction ${saved?'saved':''}`} aria-label={saved?'Премахни от запазените':'Запази автомобила'} aria-pressed={saved} onClick={()=>{try{const cars=readSaved();localStorage.setItem(savedKey,JSON.stringify(saved?cars.filter(c=>c.lot!==lot||c.site!==site):[...cars.slice(-99),{lot,site,title}]));setSaved(!saved);window.dispatchEvent(new Event('koa-saved'))}catch{}}}><Heart size={17} fill={saved?'currentColor':'none'}/></button>}
