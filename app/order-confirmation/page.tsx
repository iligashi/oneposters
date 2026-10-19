'use client'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
export default function OrderConfirmation(){return <main className="checkout-page"><div className="confirmation"><div className="confetti">✦</div><p className="kicker">Order confirmed</p><h1>Good things<br/><i>are on the way.</i></h1><p>Your order has been received and is being prepared in the studio.</p><Link className="blue-button" href="/shop">Keep shopping <ArrowRight/></Link></div></main>}
