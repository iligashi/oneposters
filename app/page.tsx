'use client'

import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  Menu,
  MoveUpRight,
  Plus,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'

const referenceImage =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-RYHl3XPYwKsSgXkScbRjbe0efys6zx.png'

const projects = [
  { title: 'Lumen / Identity', type: 'Brand system', image: referenceImage, tone: 'light' },
  { title: 'Kalt / Campaign', type: 'Social direction', image: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1200&q=85', tone: 'dark' },
  { title: 'North / Culture', type: 'Launch campaign', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=85', tone: 'violet' },
  { title: 'Uck / Stories', type: 'Editorial design', image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85', tone: 'red' },
  { title: 'Monument / Film', type: 'Art direction', image: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=85', tone: 'blue' },
  { title: 'Swords / Archive', type: 'Studio experiments', image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=85', tone: 'warm' },
]

const services = ['Brand strategy', 'Social media', 'Visual identity', 'Campaigns']

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [testerOpen, setTesterOpen] = useState(false)
  const [activeService, setActiveService] = useState('All work')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [headline, setHeadline] = useState('MAKE YOUR MARK')
  const [accent, setAccent] = useState('#d6ff00')

  const filteredProjects = useMemo(() => {
    if (activeService === 'All work') return projects
    return projects.filter((project) => project.type.toLowerCase().includes(activeService.toLowerCase().split(' ')[0]))
  }, [activeService])

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) setUploadedImage(URL.createObjectURL(file))
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#0b0b0b] text-[#f5f2eb]">
      <div className="grain" aria-hidden="true" />
      <div className="announcement"><span>Independent creative studio</span><span>Skopje · Worldwide</span><span>Scroll to explore ↓</span></div>
      <header className="site-header">
        <a href="#top" className="wordmark" aria-label="Swords agency home"><span className="wordmark-mark">⚔</span> SWORDS<span className="dot">.</span></a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#work">Work</a><a href="#process">Process</a><a href="#about">About</a><a href="#contact">Contact</a>
        </nav>
        <button className="menu-button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle menu"><Menu /></button>
      </header>
      {menuOpen && <div className="mobile-nav"><a href="#work" onClick={() => setMenuOpen(false)}>Work</a><a href="#process" onClick={() => setMenuOpen(false)}>Process</a><a href="#about" onClick={() => setMenuOpen(false)}>About</a><a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a></div>}

      <section id="top" className="hero-section">
        <div className="hero-copy reveal-up"><p className="eyebrow">SWORDS AGENCY / 001</p><h1>Brands that<br /><em>cut through.</em></h1><p className="hero-description">A social media and branding agency building sharp, culture-led identities for the brands of tomorrow.</p><a href="#work" className="circle-link" aria-label="Explore our work"><ArrowUpRight /></a></div>
        <div className="hero-orbit" aria-hidden="true"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-core"><span>BUILD<br />BOLD</span><span>MOVE<br />FAST</span></div><div className="orbit-label">SCROLL<br />TO START</div></div>
        <div className="hero-meta"><span>01—06</span><span className="line" /><span>Creative direction<br />for a moving world</span></div>
      </section>

      <section className="manifesto" id="about"><p className="eyebrow">OUR POINT OF VIEW</p><h2>We make visual identities<br /><span>impossible to ignore.</span></h2><p className="manifesto-note">Small studio energy. Big world ambition.<br />No beige brands allowed.</p></section>

      <section id="work" className="work-section"><div className="section-heading"><div><p className="eyebrow">SELECTED WORK</p><h2>Made to be <em>seen.</em></h2></div><div className="filters" role="tablist" aria-label="Filter work"><button className={activeService === 'All work' ? 'active' : ''} onClick={() => setActiveService('All work')}>All work</button>{services.slice(0, 3).map((service) => <button key={service} className={activeService === service ? 'active' : ''} onClick={() => setActiveService(service)}>{service}</button>)}</div></div><div className="project-grid">{filteredProjects.map((project, index) => <article key={project.title} className={`project-card project-${index + 1} ${project.tone}`}><img src={project.image} alt={`${project.title} project preview`} /><div className="project-overlay"><span>{project.type}</span><h3>{project.title}</h3><MoveUpRight /></div><span className="project-number">0{index + 1}</span></article>)}</div></section>

      <section id="process" className="process-section"><div className="process-intro"><p className="eyebrow">HOW WE MOVE</p><h2>Strategy first.<br /><em>Magic second.</em></h2></div><div className="process-list">{['Find the friction', 'Shape the story', 'Make it move'].map((step, index) => <div className="process-row" key={step}><span>0{index + 1}</span><h3>{step}</h3><p>{['We get under the skin of your audience and find the sharpest angle.', 'We turn the insight into a visual world people want to step into.', 'We launch, learn, and keep your brand moving forward.'][index]}</p><Plus /></div>)}</div></section>

      <section className="tester-section" id="tester"><div className="tester-copy"><p className="eyebrow">THE SWORDS TESTER</p><h2>See your image<br /><em>in the wild.</em></h2><p>Upload a photo, add your message, and get a first taste of how your next poster could feel.</p><button className="lime-button" onClick={() => setTesterOpen(true)}>Open poster lab <Sparkles /></button></div><div className="tester-preview"><div className="poster-mini"><img src={referenceImage} alt="Poster texture preview" /><div className="poster-mini-text">YOUR<br />NEXT<br /><span>MOVE</span></div></div><div className="tester-caption">01 / 01<br />Try it with your own image ↗</div></div></section>

      <section id="contact" className="contact-section"><p className="eyebrow">READY WHEN YOU ARE</p><h2>Let&apos;s make<br /><em>some noise.</em></h2><a href="mailto:hello@swords.agency" className="contact-link">hello@swords.agency <ArrowUpRight /></a><div className="contact-footer"><span>© 2025 SWORDS AGENCY</span><a href="https://www.instagram.com/swords.agencyy/?hl=en" target="_blank" rel="noreferrer"><ArrowUpRight /> @swords.agencyy</a><span>Built for the bold</span></div></section>

      {testerOpen && <div className="tester-modal" role="dialog" aria-modal="true" aria-labelledby="tester-title"><div className="tester-panel"><button className="close-button" onClick={() => setTesterOpen(false)} aria-label="Close poster lab"><X /></button><div className="modal-header"><p className="eyebrow">SWORDS POSTER LAB</p><h2 id="tester-title">Your image.<br /><em>Your energy.</em></h2></div><div className="lab-layout"><label className="upload-zone">{uploadedImage ? <img src={uploadedImage} alt="Your uploaded poster source" /> : <><Upload /><strong>Drop your image here</strong><span>or click to browse · JPG, PNG</span></>}<input type="file" accept="image/*" onChange={handleUpload} /></label><div className="lab-controls"><label>Headline<input value={headline} onChange={(event) => setHeadline(event.target.value)} /></label><label>Accent colour<div className="colour-row"><input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} /><span>{accent}</span></div></label><div className="live-poster" style={{ '--accent': accent } as React.CSSProperties}>{uploadedImage && <img src={uploadedImage} alt="Live poster preview" />}<div><span>01 / SWORDS</span><strong>{headline || 'YOUR POSTER'}</strong><small>MAKE IT MATTER</small></div></div></div></div></div></div>}
    </main>
  )
}
