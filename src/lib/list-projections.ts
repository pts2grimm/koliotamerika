import type { Car, Page } from '../payload-types'
export const articleCardSelect = { title:true, slug:true, intro:true, image:true, legacyImage:true, publishedAt:true } as const
export type ArticleCard = Pick<Page,'id'|'title'|'slug'|'intro'|'image'|'legacyImage'|'publishedAt'>
export const carCardSelect = {title:true,slug:true,make:true,year:true,price:true,mileage:true,fuel:true,availability:true,image:true,gallery:true} as const
export type CarCardData = Pick<Car,'id'|'title'|'slug'|'make'|'year'|'price'|'mileage'|'fuel'|'availability'|'image'|'gallery'>
export const adminContentSelect = {title:true,slug:true,status:true,publishedAt:true,updatedAt:true} as const
export const sitemapSelect = {slug:true,updatedAt:true} as const
