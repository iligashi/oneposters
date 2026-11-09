'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItem = { id:string; productId?:string; title:string; image:string; price:number; quantity:number; category?:string; custom?: { size:string; frame:string; paper:string; mockup?:string; artworkPath?:string; settings?:Record<string, unknown> } }
export type PromoRule = { code:string; type:string; value:number; minOrderCents:number }
type CartState = { items:CartItem[]; promo:string; promoRule:PromoRule|null; setPromoRule:(rule:PromoRule|null)=>void; drawer:boolean; add:(item:Omit<CartItem,'quantity'>)=>void; remove:(id:string)=>void; change:(id:string,delta:number)=>void; setPromo:(promo:string)=>void; clear:()=>void; open:()=>void; close:()=>void }
export const useCartStore=create<CartState>()(persist((set)=>({items:[],promo:'',promoRule:null,setPromoRule:(promoRule)=>set({promoRule,promo:promoRule?.code||''}),drawer:false,add:(item)=>set(s=>({items:s.items.some(x=>x.id===item.id)?s.items.map(x=>x.id===item.id?{...x,quantity:Math.min(10,x.quantity+1)}:x):[...s.items,{...item,quantity:1}],drawer:true})),remove:(id)=>set(s=>({items:s.items.filter(x=>x.id!==id)})),change:(id,delta)=>set(s=>({items:s.items.map(x=>x.id===id?{...x,quantity:Math.min(10,Math.max(1,x.quantity+delta))}:x)})),setPromo:(promo)=>set({promo}),clear:()=>set({items:[],promo:'',promoRule:null,drawer:false}),open:()=>set({drawer:true}),close:()=>set({drawer:false})}),{name:'oneposters-cart',version:2,migrate:(persisted)=>({...(persisted as object),promo:'',promoRule:null}) as CartState}))
export const cartSubtotal=(items:CartItem[])=>items.reduce((sum,item)=>sum+item.price*item.quantity,0)
/** Display-only estimate; the order API recalculates the real discount. */
export const cartDiscount=(subtotal:number,rule:PromoRule|null)=>{if(!rule||subtotal*100<rule.minOrderCents)return 0;const value=Number(rule.value);if(['percent','percentage'].includes(rule.type))return Math.round(subtotal*Math.min(value,100))/100;if(['fixed','amount','fixed_amount'].includes(rule.type))return Math.min(subtotal,value/100);return 0}
