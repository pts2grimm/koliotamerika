'use client'
import { useEffect,useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { readSaved,SaveAuction,type SavedCar } from './SaveAuction'
export function SavedAuctions(){const[cars,setCars]=useState<SavedCar[]>([]);const[loaded,setLoaded]=useState(false);useEffect(()=>{const update=()=>{setCars(readSaved());setLoaded(true)};update();window.addEventListener('koa-saved',update);return()=>window.removeEventListener('koa-saved',update)},[]);return <div className="saved-list">{loaded&&!cars.length&&<div className="empty-state"><h2>Все още нямаш запазени автомобили.</h2><p>Натисни сърцето върху автомобил в каталога с търгове.</p><Link className="button button-dark" href="/targove">Разгледай търговете</Link></div>}{cars.map(car=><div className="saved-item" key={`${car.site}-${car.lot}`}><Link href={`/targove/kola?lot=${car.lot}&site=${car.site}`}><span className="eyebrow orange">{car.site==='1'?'COPART':'IAAI'} · ЛОТ {car.lot}</span><h2>{car.title}</h2><span className="text-link">Виж актуалните данни <ArrowUpRight size={17}/></span></Link><SaveAuction {...car}/></div>)}</div>}
