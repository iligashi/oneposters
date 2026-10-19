'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItem = { id:string; title:string; image:string; price:number; quantity:number; category?:string; custom?: { size:string; frame:string; paper:string; mockup?:string } }
type CartState = { items:CartItem[]; promo:string; drawer:boolean; add:(item:Omit<CartItem,'quantity'>)=>void; remove:(id:string)=>void; change:(id:string,delta:number)=>void; setPromo:(promo:string)=>void; clear:()=>void; open:()=>void; close:()=>void }
export const useCartStore=create<CartState>()(persist((set)=>({items:[],promo:'',drawer:false,add:(item)=>set(s=>({items:s.items.some(x=>x.id===item.id)?s.items.map(x=>x.id===item.id?{...x,quantity:x.quantity+1}:x):[...s.items,{...item,quantity:1}],drawer:true})),remove:(id)=>set(s=>({items:s.items.filter(x=>x.id!==id)})),change:(id,delta)=>set(s=>({items:s.items.map(x=>x.id===id?{...x,quantity:Math.max(1,x.quantity+delta)}:x)})),setPromo:(promo)=>set({promo}),clear:()=>set({items:[],promo:'',drawer:false}),open:()=>set({drawer:true}),close:()=>set({drawer:false})}),{name:'oneposters-cart'}))
export const cartSubtotal=(items:CartItem[])=>items.reduce((sum,item)=>sum+item.price*item.quantity,0)
