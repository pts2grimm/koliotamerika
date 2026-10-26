'use client'
import {HomePreviewContext} from './HomePreviewContext'
export function HomePreviewShell({children}:{children:React.ReactNode}){
 return <HomePreviewContext value={true}><div onSubmitCapture={event=>{event.preventDefault();event.stopPropagation()}} onClickCapture={event=>{
  const target=event.target instanceof Element?event.target.closest('a,.save-control button,.cookie-settings-link'):null
  if(target){event.preventDefault();event.stopPropagation()}
 }}>{children}</div></HomePreviewContext>
}
