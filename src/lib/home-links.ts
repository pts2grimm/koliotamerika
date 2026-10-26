export function validHomeLink(value:unknown):value is string {
 if(typeof value!=='string'||/[\s\\\u0000-\u001f]/.test(value))return false
 if(/^\/(?!\/)/.test(value)||/^#[a-zA-Z0-9_-]+$/.test(value))return true
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password}catch{return false}
}
export function homeLink(value?:string|null){return validHomeLink(value)?value:undefined}
