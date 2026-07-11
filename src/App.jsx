import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import heroPhoto from './assets/shine-hero.jpg'

/* ============================================================
   Shine Dance Studio — public site
   Reads the live schedule from the same Supabase project as the
   admin tool. If Supabase env vars are not set, it falls back to
   the hardcoded schedule below so the site still renders fully.
   ============================================================ */

// Real schedule from ghfc.org/connect/kids — used as fallback and
// as the initial paint before the live data arrives.
const FALLBACK_SCHEDULE = {
  Monday: [
    { name: 'PreBallet', age: 'ages 5–6', time: '3:45–4:15 PM' },
    { name: 'Ballet II', age: 'ages 9+', time: '4:30–5:30 PM' },
    { name: 'Tap I/II', age: 'ages 9+', time: '5:30–6:30 PM' },
    { name: 'Tap III', age: 'ages 10+', time: '6:30–7:30 PM' },
    { name: 'Deep Roots Bible Study', age: 'ages 10+', time: '5:30–6:15 PM' },
  ],
  Tuesday: [
    { name: 'Ballet III', age: 'ages 10+', time: '3:30–4:30 PM' },
    { name: 'PrePointe', age: 'ages 12+', time: '4:30–5:00 PM' },
    { name: 'Ballet I/II', age: 'ages 9+', time: '5:00–6:00 PM' },
  ],
  Wednesday: [
    { name: 'PreBallet', age: 'ages 5–6', time: '3:30–4:00 PM' },
    { name: 'Ballet IA', age: 'ages 7–9', time: '4:00–4:45 PM' },
  ],
  Thursday: [
    { name: 'Ballet III', age: 'ages 10+', time: '3:30–4:30 PM' },
    { name: 'Ballet IB', age: 'ages 7–10', time: '4:30–5:30 PM' },
  ],
}

const CLASS_OPTIONS = [
  'Not sure yet — help me choose',
  'PreBallet (ages 5–6)',
  'Ballet IA (ages 7–9)',
  'Ballet IB (ages 7–10)',
  'Ballet I/II (ages 9+)',
  'Ballet II (ages 9+)',
  'Ballet III (ages 10+)',
  'PrePointe (ages 12+)',
  'Tap I/II (ages 9+)',
  'Tap III (ages 10+)',
]

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const BUCKET = 'site-photos'

// Announcement banner — shows active announcements within their date window.
function AnnouncementBanner() {
  const [items, setItems] = useState([])
  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const { data } = await supabase.from('announcements').select('title, message, starts_on, ends_on').eq('active', true)
      const today = new Date().toISOString().slice(0, 10)
      setItems((data || []).filter((a) => (!a.starts_on || a.starts_on <= today) && (!a.ends_on || a.ends_on >= today)))
    })()
  }, [])
  if (!items.length) return null
  return (
    <div className="announce">
      {items.map((a, i) => (
        <p key={i}><strong>{a.title}</strong>{a.message ? <> — {a.message}</> : null}</p>
      ))}
    </div>
  )
}

// Fade-up on scroll
function Reveal({ children, className = '', id }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target) } }),
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return <section ref={ref} id={id} className={`reveal ${className}`}>{children}</section>
}

function Nav() {
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <nav className={`nav ${solid ? 'solid' : ''}`}>
      <div className="nav-in">
        <a href="#top" className="logo">Shine<span>.</span></a>
        <div className="nav-links">
          <a href="#classes">Classes</a>
          <a href="#instructors">Our Team</a>
          <a href="#gallery">Gallery</a>
          <a href="#register" className="nav-cta">Register</a>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  const [photo, setPhoto] = useState(heroPhoto)
  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const { data } = await supabase.storage.from(BUCKET).list('', { limit: 100 })
      const hero = (data || []).find((f) => f.name === 'hero.jpg')
      if (hero) {
        const url = supabase.storage.from(BUCKET).getPublicUrl('hero.jpg').data.publicUrl
        setPhoto(url + '?v=' + Date.parse(hero.updated_at || hero.created_at || Date.now()))
      }
    })()
  }, [])
  return (
    <header className="hero" id="top">
      <div className="hero-bg" style={{ backgroundImage: `url(${photo})` }} />
      <div className="hero-scrim" />
      <div className="hero-in">
        <span className="hero-eyebrow">Granada Heights Friends Church</span>
        <h1>Every kid gets to <em>shine</em>.</h1>
        <p>Free dance classes for all ages and all levels. No cost, no experience needed, just a warm place to move, grow, and belong.</p>
        <div className="hero-actions">
          <a href="#register" className="btn-primary">Register your dancer</a>
          <a href="#classes" className="btn-ghost">See the schedule</a>
        </div>
        <div className="hero-badge">✦ <span><b>100% free</b>&nbsp;— no tuition, no costume fees, no catch.</span></div>
      </div>
    </header>
  )
}

function Mission() {
  return (
    <section className="mission">
      <div className="section">
        <span className="eyebrow">Why Shine</span>
        <h2>Free dance classes for our community, <em>where every kid gets to shine</em>.</h2>
        <p>Shine Dance Studio is a ministry of Granada Heights Friends Church. We're excited to offer free dance classes to children and youth in our community, at a variety of levels from beginning to intermediate, starting at age 5. No dance experience is needed to jump in!</p>
        <div className="mission-points">
          <div className="chip"><b>✦</b> Always free</div>
          <div className="chip"><b>✦</b> Ages 5 and up</div>
          <div className="chip"><b>✦</b> Beginning to intermediate</div>
          <div className="chip"><b>✦</b> No experience needed</div>
        </div>
      </div>
    </section>
  )
}

function Schedule() {
  const [days, setDays] = useState(FALLBACK_SCHEDULE)
  const [live, setLive] = useState(false)

  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const [{ data, error }, { data: counts }] = await Promise.all([
        supabase.from('classes').select('id, name, level, day_of_week, start_time, end_time, capacity').eq('active', true),
        supabase.rpc('class_enrollment_counts'),
      ])
      if (error || !data || data.length === 0) return
      const countMap = {}
      for (const r of counts || []) countMap[r.class_id] = Number(r.enrolled)
      const toMin = (t) => {
        const m = (t || '').match(/(\d+):(\d+)\s*(AM|PM)?/i)
        if (!m) return 9999
        let h = +m[1]; const ap = (m[3] || '').toUpperCase()
        if (ap === 'PM' && h !== 12) h += 12
        if (ap === 'AM' && h === 12) h = 0
        return h * 60 + +m[2]
      }
      const grouped = {}
      for (const c of data) {
        const day = c.day_of_week || 'Other'
        if (!grouped[day]) grouped[day] = []
        grouped[day].push({
          name: c.name,
          age: c.level || '',
          time: c.start_time ? `${c.start_time}${c.end_time ? `–${c.end_time}` : ''}` : '',
          sortKey: toMin(c.start_time),
          full: !!(c.capacity && (countMap[c.id] || 0) >= c.capacity),
        })
      }
      for (const day of Object.keys(grouped)) grouped[day].sort((x, y) => x.sortKey - y.sortKey)
      setDays(grouped)
      setLive(true)
    })()
  }, [])

  const orderedDays = Object.keys(days).sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))

  return (
    <Reveal className="section" id="classes">
      <div className="section-head">
        <span className="eyebrow">The Schedule</span>
        <h2>Find the right class</h2>
        <p>Ballet, tap, and more, from PreBallet for our youngest dancers up through Ballet III and Pointe.</p>
      </div>
      <div className="sched-days">
        {orderedDays.map((day) => (
          <div className="day-col" key={day}>
            <div className="day-head">{day}</div>
            <div className="day-body">
              {days[day].map((c, i) => (
                <div className="class-row" key={i}>
                  <div className="cname">{c.name} {c.age && <span className="cage">· {c.age}</span>} {c.full && <span className="full-tag">Full — waitlist open</span>}</div>
                  {c.time && <div className="ctime">{c.time}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {live && <span className="live-dot"><i /> Schedule is live — updates the moment a leader makes a change</span>}
      <p className="sched-note">Don't see a fit, or not sure where your dancer belongs? <a href="#register">Reach out</a> and we'll help you find the right class.</p>
    </Reveal>
  )
}

// Instructor photos/bios: replace initials with real photos when provided.
const TEAM = [
  { name: 'Corrie Villa', role: 'Studio Director', initials: 'CV', bio: 'Corrie leads Shine Dance Studio. (Bio coming soon — a couple of warm sentences about her heart for this ministry and these dancers.)' },
  { name: 'Coming soon', role: 'Ballet', initials: '♪', bio: 'A short, friendly bio for another member of the Shine team.' },
  { name: 'Coming soon', role: 'Tap', initials: '♪', bio: 'A short, friendly bio for another member of the Shine team.' },
]

function Instructors() {
  const [team, setTeam] = useState(null)
  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const { data } = await supabase.from('team_members').select('name, role, bio, photo_path').eq('active', true).order('sort_order')
      if (data && data.length) {
        setTeam(data.map((m) => ({
          name: m.name,
          role: m.role || '',
          bio: m.bio || '',
          photo: m.photo_path ? supabase.storage.from(BUCKET).getPublicUrl(m.photo_path).data.publicUrl : null,
          initials: (m.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2),
        })))
      }
    })()
  }, [])
  const members = team || TEAM
  return (
    <section className="instructors">
      <Reveal className="section" id="instructors">
        <div className="section-head">
          <span className="eyebrow">Our Team</span>
          <h2>The people your kids will love</h2>
          <p>The teacher at the front of the room matters more than anything else. Here's who your child will be dancing with each week.</p>
        </div>
        <div className="inst-grid">
          {members.map((t) => (
            <div className="inst-card" key={t.name + t.role}>
              {t.photo
                ? <img className="inst-photo" src={t.photo} alt={t.name} />
                : <div className="inst-photo">{t.initials}</div>}
              <h3>{t.name}</h3>
              <div className="inst-role">{t.role}</div>
              <p className="inst-bio">{t.bio}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

// Support Shine — donations flow through the church's own giving platform
// (Pushpay), so gifts land on the church's books properly. Volunteering
// mirrors the needs Corrie named: teachers, sign-in helpers, coordinators.
const GIVE_URL = 'https://pushpay.com/g/ghfclamirada'

function Support() {
  return (
    <section className="support">
      <Reveal className="section">
        <div className="section-head" style={{ marginBottom: 28 }}>
          <span className="eyebrow">Support Shine</span>
          <h2>Keep the classes free</h2>
          <p>Shine is free for every family because people give their time and resources. If you feel led, you can give through Granada Heights Friends Church, or serve alongside us — we always welcome dance teachers, sign-in helpers, and volunteers.</p>
        </div>
        <div className="support-actions">
          <a href={GIVE_URL} target="_blank" rel="noreferrer" className="btn-primary">Give through GHFC</a>
          <a href="mailto:shineGHFC@gmail.com?subject=I%27d%20like%20to%20serve%20with%20Shine" className="btn-outline">Volunteer with us</a>
        </div>
      </Reveal>
    </section>
  )
}

// Parent testimonials — renders ONLY when real quotes exist in the database.
function Testimonials() {
  const [quotes, setQuotes] = useState([])
  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const { data } = await supabase.from('testimonials').select('quote, attribution').eq('active', true)
      setQuotes(data || [])
    })()
  }, [])
  if (!quotes.length) return null
  return (
    <section className="testimonials-wrap">
      <Reveal className="section">
        <div className="section-head">
          <span className="eyebrow">From Our Families</span>
          <h2>What parents say</h2>
        </div>
        <div className="quote-grid">
          {quotes.map((q, i) => (
            <blockquote className="quote-card" key={i}>
              <p>"{q.quote}"</p>
              {q.attribution && <footer>— {q.attribution}</footer>}
            </blockquote>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

// Gallery: reads photos Corrie uploads in the admin tool (Photos screen).
// Shows "coming soon" tiles until photos exist. Release-cleared photos only.
const GALLERY_LAYOUT = ['tall', 'wide', '', '', 'wide', '', 'tall', '']

function Gallery() {
  const [photos, setPhotos] = useState([])
  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const { data } = await supabase.storage.from(BUCKET).list('gallery', { limit: 24 })
      setPhotos((data || []).filter((f) => f.name !== '.emptyFolderPlaceholder').map((f) =>
        supabase.storage.from(BUCKET).getPublicUrl('gallery/' + f.name).data.publicUrl
      ))
    })()
  }, [])
  const tiles = photos.length ? photos : [null, null, null, null, null]
  return (
    <Reveal className="section" id="gallery">
      <div className="section-head">
        <span className="eyebrow">In the Studio</span>
        <h2>See the joy</h2>
        <p>Photos from our classes and recitals.{photos.length === 0 && ' (More coming soon!)'}</p>
      </div>
      <div className="gallery-grid">
        {tiles.map((src, i) => (
          <figure className={`${GALLERY_LAYOUT[i % GALLERY_LAYOUT.length]} ${src ? 'has-img' : ''}`} key={i}>
            {src ? <img src={src} alt="Shine Dance Studio" loading="lazy" /> : <span>Photo coming soon</span>}
          </figure>
        ))}
      </div>
    </Reveal>
  )
}

const BLANK_FORM = { parent_name: '', email: '', phone: '', student_name: '', student_grade: '', interested_class: CLASS_OPTIONS[0], waiver: false }

function Register() {
  const [form, setForm] = useState(BLANK_FORM)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const [liveClasses, setLiveClasses] = useState(null)

  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const [{ data: cls }, { data: counts }] = await Promise.all([
        supabase.from('classes').select('id, name, level, capacity').eq('active', true).order('name'),
        supabase.rpc('class_enrollment_counts'),
      ])
      if (!cls || !cls.length) return
      const map = {}
      for (const r of counts || []) map[r.class_id] = Number(r.enrolled)
      setLiveClasses(cls.map((c) => ({ name: c.name, level: c.level, full: !!(c.capacity && (map[c.id] || 0) >= c.capacity) })))
    })()
  }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function submit() {
    setErr('')
    if (!form.parent_name.trim() || !form.student_name.trim()) { setErr('Please add your name and your dancer\'s name.'); return }
    if (!form.email.trim() && !form.phone.trim()) { setErr('Please add an email or a phone number so we can reach you.'); return }
    if (!form.waiver) { setErr('Please check the permission box to continue.'); return }
    if (!supabase) { setErr('Registration isn\'t connected yet. Please email Corrie at shineGHFC@gmail.com and she\'ll get you set up.'); return }
    setBusy(true)
    const { error } = await supabase.from('registrations').insert({
      parent_name: form.parent_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      student_name: form.student_name.trim(),
      student_grade: form.student_grade.trim() || null,
      interested_class: form.interested_class,
      waiver_acknowledged: true,
    })
    setBusy(false)
    if (error) { setErr('Something went wrong saving your registration. Please try again, or email shineGHFC@gmail.com.'); return }
    setDone(true)
  }

  return (
    <section className="register" id="register">
      <div className="section">
        <div>
          <span className="eyebrow">Registration</span>
          <h2>Ready to join us?</h2>
          <p className="lead">Fill this out to sign up or to be added to a waiting list, and Corrie will reach out with your dancer's class details. It takes about two minutes.</p>
          <ul className="reg-perks">
            <li><span className="dot">✓</span> Completely free — always</li>
            <li><span className="dot">✓</span> No dance experience required</li>
            <li><span className="dot">✓</span> A safe, encouraging environment</li>
            <li><span className="dot">✓</span> Every age and level welcome</li>
          </ul>
        </div>
        <div className="form-card">
          {done ? (
            <div className="form-ok">
              <div className="big">🎉</div>
              <h3>You're in!</h3>
              <p>Thanks, {form.parent_name.split(' ')[0]}. Corrie will reach out soon with details for {form.student_name.split(' ')[0]}'s class.</p>
            </div>
          ) : (
            <>
              <h3>Register your dancer</h3>
              <p className="sub">Sign up or join the waiting list — we'll take it from there.</p>
              {err && <div className="form-err">{err}</div>}
              <div className="fg">
                <label>Parent / guardian name</label>
                <input type="text" placeholder="Your name" value={form.parent_name} onChange={set('parent_name')} />
              </div>
              <div className="fg2">
                <div className="fg"><label>Email</label><input type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} /></div>
                <div className="fg"><label>Phone</label><input type="tel" placeholder="(000) 000-0000" value={form.phone} onChange={set('phone')} /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label>Child's name</label><input type="text" placeholder="Dancer's name" value={form.student_name} onChange={set('student_name')} /></div>
                <div className="fg"><label>Grade or age</label><input type="text" placeholder="e.g. 4th" value={form.student_grade} onChange={set('student_grade')} /></div>
              </div>
              <div className="fg">
                <label>Class of interest</label>
                <select value={form.interested_class} onChange={set('interested_class')}>
                  <option>Not sure yet — help me choose</option>
                  {liveClasses
                    ? liveClasses.map((c) => <option key={c.name} value={c.name}>{c.name}{c.level ? ` (${c.level})` : ''}{c.full ? ' — FULL, joins waitlist' : ''}</option>)
                    : CLASS_OPTIONS.slice(1).map((c) => <option key={c}>{c}</option>)}
                </select>
                {liveClasses && liveClasses.find((c) => c.name === form.interested_class)?.full && (
                  <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 6 }}>This class is currently full — your dancer will be added to the waitlist and Corrie will reach out.</p>
                )}
              </div>
              <label className="check">
                <input type="checkbox" checked={form.waiver} onChange={set('waiver')} />
                <span>I understand this is a church ministry program and give permission for my child to participate.</span>
              </label>
              <button className="btn-primary" onClick={submit} disabled={busy}>{busy ? 'Sending…' : 'Submit registration'}</button>
              <p className="form-note">Questions? Email Corrie Villa at shineGHFC@gmail.com and she'll help you get started.</p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer>
      <div className="foot-in">
        <div className="foot-col">
          <div className="logo">Shine<span style={{ color: 'var(--brass)' }}>.</span></div>
          <p>A free dance ministry of<br />Granada Heights Friends Church.</p>
        </div>
        <div className="foot-col">
          <h4>Visit</h4>
          <p>Granada Heights Friends Church<br />11818 La Mirada Blvd.<br />La Mirada, CA 90638</p>
        </div>
        <div className="foot-col">
          <h4>Connect</h4>
          <a href="mailto:shineGHFC@gmail.com">shineGHFC@gmail.com</a>
          <a href="tel:5629437255">562.943.7255</a>
          <a href="https://www.ghfc.org" target="_blank" rel="noreferrer">www.ghfc.org</a>
        </div>
        <div className="foot-col">
          <h4>Get started</h4>
          <a href="#register">Register a dancer</a>
          <a href="#classes">View classes</a>
          <a href="https://pushpay.com/g/ghfclamirada" target="_blank" rel="noreferrer">Give through GHFC</a>
        </div>
      </div>
      <div className="foot-bottom">Shine Dance Studio · Granada Heights Friends Church</div>
    </footer>
  )
}

export default function App() {
  return (
    <>
      <Nav />
      <Hero />
      <AnnouncementBanner />
      <Mission />
      <Schedule />
      <Instructors />
      <Testimonials />
      <Gallery />
      <Support />
      <Register />
      <Footer />
    </>
  )
}
