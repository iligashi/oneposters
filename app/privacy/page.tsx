import Link from 'next/link'
import styles from './privacy.module.css'

export const metadata = {
  title: 'Privacy notice - oneposters',
  description: 'How oneposters handles account, order, design, and website data.',
}

export default function PrivacyPage() {
  return <main className={`info-page ${styles.page}`}>
    <header className="info-header">
      <Link href="/" className="store-logo"><span>one</span><small>posters</small></Link>
      <Link href="/shop" className="text-link">Shop posters &rarr;</Link>
    </header>
    <section className="info-hero">
      <p className="kicker">Privacy / clear and simple</p>
      <h1>Your data,<br /><i>with care.</i></h1>
      <p className={styles.body}>This draft describes data flows visible in the current oneposters website. It needs the operator details and retention decisions below before it can serve as a final privacy notice.</p>
    </section>
    <aside className={styles.draft} role="note">
      <strong>Owner review required before launch</strong>
      <p>Add the operator's registered legal name and postal address, confirm lawful bases and retention periods, and verify service regions and international transfer terms with Supabase and Vercel. The application code cannot determine those business and contract details.</p>
    </aside>
    <div className={styles.copy}>
      <section className={styles.section}><p className="kicker">01 / Who operates this site</p><h2 className={styles.heading}>Controller contact</h2><p className={styles.body}>The site is operated under the name oneposters. Contact <a href="mailto:hello@oneposters.studio">hello@oneposters.studio</a> with privacy questions or requests. The legal entity or individual name and postal address of the data controller have not been provided in the project and must be added here before publication.</p></section>
      <section className={styles.section}><p className="kicker">02 / Information handled</p><h2 className={styles.heading}>What the site uses</h2><ul>
        <li className={styles.item}><strong>Accounts:</strong> email address and authentication session information, handled through Supabase Auth when you create or sign into an account.</li>
        <li className={styles.item}><strong>Order requests:</strong> name, email, delivery address, selected products and options. The current checkout records an unpaid order request; it does not collect card details.</li>
        <li className={styles.item}><strong>Poster images:</strong> images uploaded to the studio or admin are stored in public Vercel Blob objects. Anyone with an image URL may be able to view that image, so do not upload material you need to keep private.</li>
        <li className={styles.item}><strong>On-device preferences:</strong> cart, wishlist, theme, recently viewed products and studio draft settings are saved in browser storage. These remain on your device unless you submit relevant order information or upload an image.</li>
        <li className={styles.item}><strong>Website analytics:</strong> Vercel Web Analytics is loaded in production. Vercel says Web Analytics does not use cookies and uses a visitor hash that resets daily; page views, referrers and device or location categories may be reported. See <a href="https://vercel.com/docs/analytics" target="_blank" rel="noreferrer">Vercel Analytics documentation</a>.</li>
      </ul></section>
      <section className={styles.section}><p className="kicker">03 / Why and how long</p><h2 className={styles.heading}>Purposes and retention</h2><p className={styles.body}>Account and order information supports account access, responding to order requests, delivery coordination and customer support. Uploaded images support the poster studio and product catalog. Analytics supports aggregate site measurement. The exact legal basis for each purpose and the retention schedule for account, customer, order and uploaded-image data must be confirmed by the operator and added before launch. Cart, wishlist, theme and studio preferences can be removed by clearing this site's browser storage.</p></section>
      <section className={styles.section}><p className="kicker">04 / Service providers</p><h2 className={styles.heading}>Where information goes</h2><p className={styles.body}>The application connects to Supabase for authentication and database services, and Vercel for hosting, public image storage and production analytics. Confirm the project's selected data regions, applicable data-processing agreements, subprocessors and any international transfers in the provider dashboards and contracts before publication.</p></section>
      <section className={styles.section}><p className="kicker">05 / Your choices</p><h2 className={styles.heading}>Access and requests</h2><p className={styles.body}>You can contact <a href="mailto:hello@oneposters.studio">hello@oneposters.studio</a> to ask about access, correction, deletion, restriction, objection or portability where those rights apply. You may also complain to the data protection authority responsible for your location. Requests will be handled under the applicable privacy laws.</p></section>
      <section className={styles.section}><p className="kicker">06 / Security and updates</p><h2 className={styles.heading}>Protecting information</h2><p className={styles.body}>The site uses authenticated access for account and admin functions and HTTPS in deployment. No internet service can promise perfect security. This notice should be updated when the site's data practices or service providers change.</p></section>
      <section className={styles.todo}><p className="kicker">Before publishing this notice</p><ul>
        <li className={styles.item}>Replace the operator placeholder with the responsible person or company's legal name and postal address.</li>
        <li className={styles.item}>Set and state the lawful basis and retention period for each data category.</li>
        <li className={styles.item}>Confirm hosting, database and Blob storage regions, processors, transfers and deletion behavior.</li>
        <li className={styles.item}>Review cookie and browser-storage requirements for the countries where the shop operates.</li>
      </ul></section>
    </div>
  </main>
}
