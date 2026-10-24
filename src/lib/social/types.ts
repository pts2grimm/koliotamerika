export type SocialKind = 'article' | 'vehicle' | 'tip'
export type SocialStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'uncertain' | 'cancelled'
export type SocialPost = {
 id:string; source_key:string; slot:string; kind:SocialKind; title:string; message:string; link:string;
 status:SocialStatus; scheduled_at:string; approved_at:string; approved_by:string; page_id:string;
 facebook_id:string; error_code:string; created_at:string; updated_at:string; started_at:string; published_at:string; revision:number
}
export type SocialSettings = { prepare:boolean; enabled:boolean; weekdays:number[]; time:string; vehicles:string[]; verifiedPageId:string; verifiedPageName:string; verifiedAt:string }
export const defaultSettings:SocialSettings = {prepare:false,enabled:false,weekdays:[1,3,5],time:'18:30',vehicles:[],verifiedPageId:'',verifiedPageName:'',verifiedAt:''}
export const statusLabels:Record<SocialStatus,string>={draft:'За одобрение',scheduled:'Насрочен',publishing:'Изпраща се',published:'Публикуван',failed:'Нуждае се от преглед',uncertain:'Провери във Facebook',cancelled:'Отменен'}
export const kindLabels:Record<SocialKind,string>={article:'Статия',vehicle:'Автомобил',tip:'Практически съвет'}
