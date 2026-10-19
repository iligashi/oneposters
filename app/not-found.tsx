import Link from 'next/link'
export default function NotFound(){return <main className="not-found"><div className="lost-poster"><span>404</span><i>this wall is<br/>still waiting.</i></div><p className="kicker">Looks like this print wandered off.</p><h1>Nothing here<br/><i>yet.</i></h1><Link className="blue-button" href="/shop">Back to the collection →</Link></main>}
