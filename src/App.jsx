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

// Fetches admin-editable copy from the `site_content` table (Admin → Site
// Content). Pass in the defaults for exactly the keys this component needs;
// if the table is empty, unreachable, or missing a key, the default is used
// instead — nothing on the live site can break from this, it can only get
// overridden once Corrie deliberately edits something.
function useSiteContent(defaults) {
  const [content, setContent] = useState(defaults)
  useEffect(() => {
    if (!supabase) return
    (async () => {
      const { data } = await supabase.from('site_content').select('key, value').in('key', Object.keys(defaults))
      if (data && data.length) {
        setContent((c) => {
          const merged = { ...c }
          for (const row of data) if (row.value) merged[row.key] = row.value
          return merged
        })
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- defaults is a fresh object each render by design; only fetch once on mount
  return content
}

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
  const [showInterest, setShowInterest] = useState(false)
  const [iForm, setIForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [iBusy, setIBusy] = useState(false)
  const [iDone, setIDone] = useState(false)
  const [iErr, setIErr] = useState('')
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const setI = (k) => (e) => setIForm({ ...iForm, [k]: e.target.value })
  async function submitInterest() {
    setIErr('')
    if (!iForm.name.trim()) { setIErr('Please add your name.'); return }
    if (!iForm.email.trim()) { setIErr('Please add an email so we can reach you.'); return }
    if (!supabase) { setIErr('Not connected yet — please email shineGHFC@gmail.com directly.'); return }
    setIBusy(true)
    const { error } = await supabase.from('contact_interest').insert({
      name: iForm.name.trim(), email: iForm.email.trim(), phone: iForm.phone.trim() || null, message: iForm.message.trim() || null,
    })
    setIBusy(false)
    if (error) { setIErr('Something went wrong — please email shineGHFC@gmail.com.'); return }
    setIDone(true)
  }
  return (
    <>
      <nav className={`nav ${solid ? 'solid' : ''}`}>
        <div className="nav-in">
          <a href="/" className="logo">Shine<span>.</span></a>
          <div className="nav-links">
            <a href="/#classes">Classes</a>
            <a href="/#instructors">Our Team</a>
            <a href="/#gallery">Gallery</a>
            <a href="/policies">Policies &amp; Forms</a>
            <button className="nav-text-btn" onClick={() => { setShowInterest(true); setIDone(false); setIErr('') }}>Just have questions?</button>
            <a href="/#register" className="nav-cta">Register</a>
          </div>
        </div>
      </nav>
      {showInterest && (
        <div className="vol-overlay" onClick={() => setShowInterest(false)}>
          <div className="vol-modal" onClick={(e) => e.stopPropagation()}>
            {iDone ? (
              <div style={{ textAlign: 'center', padding: '10px 4px' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>👋</div>
                <h3 style={{ marginBottom: 8 }}>You're on the list!</h3>
                <p style={{ color: 'var(--ink-soft)', fontSize: 15 }}>We'll reach out when there's news or a new class opens up.</p>
                <button className="btn-primary" style={{ marginTop: 18 }} onClick={() => setShowInterest(false)}>Close</button>
              </div>
            ) : (
              <>
                <h3 style={{ marginBottom: 4 }}>Not ready to enroll yet?</h3>
                <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 18 }}>Add your info and we'll keep you posted — no commitment, no registration needed.</p>
                {iErr && <div className="vol-err">{iErr}</div>}
                <div className="vol-fg"><label>Your name</label><input value={iForm.name} onChange={setI('name')} placeholder="Name" /></div>
                <div className="vol-fg"><label>Email</label><input type="email" value={iForm.email} onChange={setI('email')} placeholder="you@email.com" /></div>
                <div className="vol-fg"><label>Phone (optional)</label><input type="tel" value={iForm.phone} onChange={setI('phone')} placeholder="(000) 000-0000" /></div>
                <div className="vol-fg"><label>Anything you'd like us to know? (optional)</label><textarea value={iForm.message} onChange={setI('message')} rows={2} /></div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                  <button className="btn-outline" onClick={() => setShowInterest(false)}>Cancel</button>
                  <button className="btn-primary" onClick={submitInterest} disabled={iBusy}>{iBusy ? 'Sending…' : 'Keep me posted'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function Hero() {
  // Loads the real hero photo before ever showing it, instead of showing
  // one photo then swapping to another a moment later — that swap was the
  // "flash" Corrie flagged (happens on first load, and again every time
  // someone navigates back from /policies, since that's a full page
  // reload). A solid navy gradient shows until the real photo is
  // confirmed ready, then it fades in — never shows something wrong.
  const [photo, setPhoto] = useState(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    async function resolveUrl() {
      if (!supabase) return heroPhoto
      try {
        const { data } = await supabase.storage.from(BUCKET).list('', { limit: 100 })
        const hero = (data || []).find((f) => f.name === 'hero.jpg')
        if (hero) {
          const url = supabase.storage.from(BUCKET).getPublicUrl('hero.jpg').data.publicUrl
          return url + '?v=' + Date.parse(hero.updated_at || hero.created_at || Date.now())
        }
      } catch (_e) { /* fall through to bundled default */ }
      return heroPhoto
    }
    resolveUrl().then((url) => {
      const img = new Image()
      img.onload = () => { if (!cancelled) { setPhoto(url); setReady(true) } }
      img.onerror = () => { if (!cancelled) { setPhoto(heroPhoto); setReady(true) } }
      img.src = url
    })
    return () => { cancelled = true }
  }, [])
  const sc = useSiteContent({
    hero_headline: 'Shining the Light of Jesus.',
    hero_subtext: 'Free classes for our community. Shining God\u2019s love to students and families.',
    hero_verse: '"Let your light shine before others, that they may see your good deeds and glorify your Father in heaven." — Matthew 5:16',
    donation_badge: 'Shine runs on volunteers and donations. Classes are free, but a $100 donation is suggested per family at registration for those who are able.',
  })
  return (
    <header className="hero" id="top">
      <div className="hero-bg">
        <div className={`hero-photo ${ready ? 'is-ready' : ''}`} style={photo ? { backgroundImage: `url(${photo})` } : undefined} />
      </div>
      <div className="hero-scrim" />
      <div className="hero-in">
        <span className="hero-eyebrow">Granada Heights Friends Church</span>
        <h1>{sc.hero_headline}</h1>
        <p className="hero-verse">{sc.hero_verse}</p>
        <p>{sc.hero_subtext}</p>
        <div className="hero-actions">
          <a href="#register" className="btn-primary">Register your dancer</a>
          <a href="#classes" className="btn-ghost">See the schedule</a>
        </div>
        <div className="hero-badge">✦ <span>{sc.donation_badge}</span></div>
      </div>
    </header>
  )
}

function Mission() {
  const sc = useSiteContent({
    mission_headline: 'Free dance classes for our community, connecting students with Christ.',
    mission_body: 'Shine Dance Studio is a ministry of Granada Heights Friends Church. We\u2019re excited to offer free dance classes to children and youth in our community, at a variety of levels from beginning to advanced, starting at age 5. No dance experience is needed to jump in!',
    mission_chip_level: 'Beginning to advanced',
  })
  return (
    <section className="mission">
      <div className="section">
        <span className="eyebrow">Why Shine</span>
        <h2>{sc.mission_headline}</h2>
        <p>{sc.mission_body}</p>
        <div className="mission-points">
          <div className="chip"><b>✦</b> Always free</div>
          <div className="chip"><b>✦</b> Ages 5 and up</div>
          <div className="chip"><b>✦</b> {sc.mission_chip_level}</div>
          <div className="chip"><b>✦</b> No experience needed</div>
        </div>
      </div>
    </section>
  )
}

function Schedule() {
  const [days, setDays] = useState(FALLBACK_SCHEDULE)
  const [live, setLive] = useState(false)
  const [view, setView] = useState('list')

  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const [{ data: rawData, error }, { data: counts }] = await Promise.all([
        supabase.from('classes').select('id, name, level, day_of_week, start_time, end_time, capacity, min_age, max_age, season').eq('active', true),
        supabase.rpc('class_enrollment_counts'),
      ])
      if (error || !rawData || rawData.length === 0) return
      // Only show the most recent season on the public schedule so old
      // years don't linger after a rollover.
      const seasons = [...new Set(rawData.map((c) => c.season || ''))].sort().reverse()
      const data = seasons.length > 1 ? rawData.filter((c) => (c.season || '') === seasons[0]) : rawData
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
        const ageRange = (c.min_age || c.max_age) ? `Ages ${c.min_age || 0}${c.max_age ? `–${c.max_age}` : '+'}` : ''
        grouped[day].push({
          name: c.name,
          age: c.level || ageRange,
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
      <div className="view-toggle">
        <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List</button>
        <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Weekly calendar</button>
      </div>
      {view === 'week' ? (
        <div className="week-grid">
          {orderedDays.map((day) => (
            <div className="week-col" key={day}>
              <div className="week-day">{day}</div>
              {days[day].map((c, i) => (
                <div className={`week-class ${c.full ? 'full' : ''}`} key={i}>
                  <div className="wc-time">{c.time}</div>
                  <div className="wc-name">{c.name}</div>
                  {c.age && <div className="wc-age">{c.age}</div>}
                  {c.full && <div className="wc-full">Waitlist</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
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
      )}
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
// The registration donation flow uses Shine's own CCB form, not Pushpay,
// per Corrie's confirmation.
const REGISTRATION_DONATION_URL = 'https://granadaheightsfriendschurch.ccbchurch.com/goto/forms/303/responses/new'

function Support() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  async function submit() {
    setErr('')
    if (!form.name.trim()) { setErr('Please add your name.'); return }
    if (!form.email.trim() && !form.phone.trim()) { setErr('Please add an email or phone so we can reach you.'); return }
    if (!supabase) { setErr('Not connected yet — please email shineGHFC@gmail.com directly.'); return }
    setBusy(true)
    const { error } = await supabase.from('volunteer_inquiries').insert({
      name: form.name.trim(), email: form.email.trim() || null,
      phone: form.phone.trim() || null, message: form.message.trim() || null,
    })
    setBusy(false)
    if (error) { setErr('Something went wrong — please email shineGHFC@gmail.com.'); return }
    setDone(true)
  }
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
          <button className="btn-outline" onClick={() => { setShowForm(true); setDone(false); setErr('') }}>Volunteer with us</button>
        </div>
      </Reveal>
      {showForm && (
        <div className="vol-overlay" onClick={() => setShowForm(false)}>
          <div className="vol-modal" onClick={(e) => e.stopPropagation()}>
            {done ? (
              <div style={{ textAlign: 'center', padding: '10px 4px' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🙌</div>
                <h3 style={{ marginBottom: 8 }}>Thank you, {form.name.split(' ')[0]}!</h3>
                <p style={{ color: 'var(--ink-soft)', fontSize: 15 }}>Corrie will reach out about serving with Shine.</p>
                <button className="btn-primary" style={{ marginTop: 18 }} onClick={() => setShowForm(false)}>Close</button>
              </div>
            ) : (
              <>
                <h3 style={{ marginBottom: 4 }}>Volunteer with Shine</h3>
                <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 18 }}>Tell us a little about you and Corrie will be in touch.</p>
                {err && <div className="vol-err">{err}</div>}
                <div className="vol-fg"><label>Your name</label><input value={form.name} onChange={set('name')} placeholder="Name" /></div>
                <div className="vol-fg"><label>Email</label><input type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" /></div>
                <div className="vol-fg"><label>Phone</label><input type="tel" value={form.phone} onChange={set('phone')} placeholder="(000) 000-0000" /></div>
                <div className="vol-fg"><label>How would you like to help? (optional)</label><textarea value={form.message} onChange={set('message')} rows={3} placeholder="Teaching, sign-in help, etc." /></div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                  <button className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="btn-primary" onClick={submit} disabled={busy}>{busy ? 'Sending…' : 'Send'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
          <h2>What families say</h2>
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

function Gallery() {
  const [photos, setPhotos] = useState([])
  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const { data } = await supabase.storage.from(BUCKET).list('gallery', { limit: 100 })
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
          <figure className={src ? 'has-img' : ''} key={i}>
            {src ? <img src={src} alt="Shine Dance Studio" loading="lazy" /> : <span>Photo coming soon</span>}
          </figure>
        ))}
      </div>
    </Reveal>
  )
}

const BLANK_FORM = {
  is_returning: '', // '' | 'new' | 'returning'
  parent_name: '', email: '', phone: '',
  student_name: '', student_grade: '', student_age: '', student_birthday: '',
  secondary_parent_name: '', secondary_parent_email: '', secondary_parent_phone: '',
  emergency_contact_name: '', emergency_contact_relationship: '', emergency_contact_phone: '',
  interested_classes: [], not_sure: false,
  heard_about: '', heard_about_other: '',
  meeting_aug28: false, meeting_sep3: false, meeting_acknowledged: false,
  wants_donation: false,
  waiver: false,
}
const HEARD_ABOUT_OPTIONS = [
  'Friend or family referral',
  'Church bulletin or announcement',
  'Social media',
  'Website / online search',
  'Saw a Shine performance',
  'Other',
]

function Register() {
  const sc = useSiteContent({
    registration_intro: 'Fill this out to sign up or to be added to a waiting list, and Corrie will reach out with your dancer\u2019s class details. It takes about five minutes.',
    meeting_aug28_label: 'Friday, August 28th, 6:00–7:00pm (Lindley Hall)',
    meeting_sep3_label: 'Wednesday, September 2nd, 7:00–8:00pm (Joy Hall)',
    not_sure_label: 'I\u2019m not sure — please contact me to help pick the right class.',
    class_select_label: 'Please select your class(es) for enrollment.',
  })
  const [form, setForm] = useState(BLANK_FORM)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const [liveClasses, setLiveClasses] = useState(null)

  const [outcomes, setOutcomes] = useState([]) // per-class result shown on confirmation

  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const [{ data: cls }, { data: counts }] = await Promise.all([
        supabase.from('classes').select('id, name, level, capacity, day_of_week, start_time, end_time, min_age, max_age').eq('active', true).order('name'),
        supabase.rpc('class_enrollment_counts'),
      ])
      if (!cls || !cls.length) return
      const map = {}
      for (const r of counts || []) map[r.class_id] = Number(r.enrolled)
      setLiveClasses(cls.map((c) => {
        const ageRange = (c.min_age || c.max_age) ? `Ages ${c.min_age || 0}${c.max_age ? `–${c.max_age}` : '+'}` : ''
        const when = [c.day_of_week, c.start_time ? `${c.start_time}${c.end_time ? `–${c.end_time}` : ''}` : ''].filter(Boolean).join(' ')
        return {
          id: c.id, name: c.name, level: c.level, when, ageRange, capacity: c.capacity,
          full: !!(c.capacity && (map[c.id] || 0) >= c.capacity),
        }
      }))
    })()
  }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  // Keyed by class ID, not name. Two classes can have the same or very
  // similar names (this happened in practice — two separate "Monday
  // Ballet III" entries), and matching by name meant a duplicate-named
  // class could visually select alongside the one actually clicked, or a
  // student could get logged as interested in one and enrolled in the
  // other. IDs are always unique, so this can't happen once fixed.
  function toggleClass(id) {
    setForm((f) => ({
      ...f,
      interested_classes: f.interested_classes.includes(id)
        ? f.interested_classes.filter((c) => c !== id)
        : [...f.interested_classes, id],
    }))
  }

  async function submit() {
    setErr('')
    if (!form.is_returning) { setErr('Please let us know if your dancer is new to Shine or returning.'); return }
    if (!form.parent_name.trim()) { setErr('Please add your name.'); return }
    if (!form.email.trim()) { setErr('Please add your email address.'); return }
    if (!form.phone.trim()) { setErr('Please add your phone number.'); return }
    if (!form.student_name.trim()) { setErr('Please add your dancer\'s name.'); return }
    if (!form.student_grade.trim()) { setErr('Please add your dancer\'s grade.'); return }
    if (!form.student_age.trim()) { setErr('Please add your dancer\'s age.'); return }
    if (!form.student_birthday) { setErr('Please add your dancer\'s birthday.'); return }
    if (!form.emergency_contact_name.trim()) { setErr('Please add an emergency contact name.'); return }
    if (!form.emergency_contact_relationship.trim()) { setErr('Please add the emergency contact\'s relationship to your dancer.'); return }
    if (!form.emergency_contact_phone.trim()) { setErr('Please add an emergency contact phone number.'); return }
    if (!form.interested_classes.length && !form.not_sure) { setErr('Please select at least one class, or check "I\'m not sure — please contact me."'); return }
    if (!form.heard_about) { setErr('Please let us know how you heard about us.'); return }
    if (form.heard_about === 'Other' && !form.heard_about_other.trim()) { setErr('Please tell us a bit more in the "how did you hear about us" box.'); return }
    if (!form.meeting_aug28 && !form.meeting_sep3) { setErr('Please select at least one Mandatory Parent Meeting date you plan to attend.'); return }
    if (!form.meeting_acknowledged) { setErr('Please confirm you understand enrollment isn\'t complete until a parent meeting is attended.'); return }
    if (!form.waiver) { setErr('Please check the permission box to continue.'); return }
    if (!supabase) { setErr('Registration isn\'t connected yet. Please email Corrie at shineGHFC@gmail.com and she\'ll get you set up.'); return }
    setBusy(true)

    // Resolve which of the selected class IDs are real, live classes BEFORE
    // creating the student — this also produces the human-readable class
    // names used in the log and confirmation email.
    const matchedClasses = form.interested_classes
      .map((id) => (liveClasses || []).find((c) => c.id === id))
      .filter(Boolean)
    const classesText = form.not_sure || !matchedClasses.length
      ? 'Not sure yet — help me choose'
      : matchedClasses.map((c) => c.name).join(', ')
    const heardAbout = form.heard_about === 'Other'
      ? `Other: ${form.heard_about_other.trim()}`
      : form.heard_about

    // 1. Log the raw registration (Corrie's record of what was submitted —
    //    unchanged from before). Built as a plain object first so the same
    //    data can be sent straight to the email function below — public
    //    visitors can INSERT into registrations but can't read rows back,
    //    so we don't rely on Supabase handing the row back to us.
    const regRow = {
      parent_name: form.parent_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      student_name: form.student_name.trim(),
      student_grade: form.student_grade.trim() || null,
      student_age: form.student_age.trim() || null,
      student_birthday: form.student_birthday || null,
      secondary_parent_name: form.secondary_parent_name.trim() || null,
      secondary_parent_email: form.secondary_parent_email.trim() || null,
      secondary_parent_phone: form.secondary_parent_phone.trim() || null,
      emergency_contact_name: form.emergency_contact_name.trim() || null,
      emergency_contact_relationship: form.emergency_contact_relationship.trim() || null,
      emergency_contact_phone: form.emergency_contact_phone.trim() || null,
      interested_class: classesText,
      heard_about: heardAbout || null,
      is_returning: form.is_returning === 'returning',
      meeting_aug28: form.meeting_aug28,
      meeting_sep3: form.meeting_sep3,
      meeting_acknowledged: true,
      wants_donation: form.wants_donation,
      waiver_acknowledged: true,
      processed: true, // no admin approval step anymore — this is just a log
    }
    const { error: regErr } = await supabase.from('registrations').insert(regRow)
    if (regErr) console.error('Registration: registrations log insert failed —', regErr)

    // (The registration emails are sent further down, after enrollment,
    //  so the parent's confirmation can state real enrolled/waitlist
    //  outcomes per class instead of just listing what they asked for.)

    // 2. Create the real family + student + enrollment records immediately,
    //    with real-time capacity checking, so the parent sees right now
    //    whether they got the spot or are waitlisted. Always a FRESH
    //    record — no attempt to match/merge into an existing family, even
    //    for "returning" students (that matching only stays safe with a
    //    human reviewing it, which conflicts with instant processing).
    const [pFirst, ...pRest] = form.parent_name.trim().split(' ')
    // Generating the ID here, instead of letting the database hand one
    // back, is the actual fix for the 401 errors. supabase.insert(...).
    // select() asks PostgREST to read the row back after inserting it —
    // which requires SELECT permission on the table. Public visitors were
    // deliberately never given SELECT on families/students (correctly —
    // nobody should be able to read another family's data), so that
    // read-back was always going to fail. This was true from the very
    // start of this project, not something introduced recently. Generating
    // the id ourselves means the insert never needs to ask for anything
    // back at all.
    const famId = crypto.randomUUID()
    const { error: famErr } = await supabase.from('families').insert({
      id: famId,
      parent_first_name: pFirst || form.parent_name.trim(),
      parent_last_name: pRest.join(' ') || '',
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      secondary_parent_name: form.secondary_parent_name.trim() || null,
      secondary_parent_email: form.secondary_parent_email.trim() || null,
      secondary_parent_phone: form.secondary_parent_phone.trim() || null,
      emergency_contact_name: form.emergency_contact_name.trim() || null,
      emergency_contact_relationship: form.emergency_contact_relationship.trim() || null,
      emergency_contact_phone: form.emergency_contact_phone.trim() || null,
      notes: form.wants_donation ? 'Registration donation intent noted at signup.' : null,
    })
    const fam = famErr ? null : { id: famId }
    if (famErr) console.error('Registration: family insert failed —', famErr)

    const [sFirst, ...sRest] = form.student_name.trim().split(' ')
    const meetingNote = [form.meeting_aug28 && 'Aug 28 meeting', form.meeting_sep3 && 'Sep 3 meeting'].filter(Boolean).join(' + ')
    const stuId = crypto.randomUUID()
    const { error: stuErr } = await supabase.from('students').insert({
      id: stuId,
      first_name: sFirst || form.student_name.trim(),
      last_name: sRest.join(' ') || '',
      grade: form.student_grade.trim() || null,
      birthday: form.student_birthday || null,
      family_id: fam?.id || null,
      // Active if they matched at least one real class (so they show up on
      // the default Students view right away). Inactive if they picked
      // "Not sure yet" or nothing matched a live class, so Corrie still
      // knows to follow up via the Inactive filter or the Registrations log.
      season_status: matchedClasses.length ? 'active' : 'inactive',
      notes: [
        form.student_age ? `Age at registration: ${form.student_age}.` : '',
        meetingNote ? `Parent meeting selected at registration: ${meetingNote}.` : '',
        form.is_returning === 'returning' ? 'Registered as a returning student.' : 'Registered as a new student.',
      ].filter(Boolean).join(' ') || null,
    })
    const stu = stuErr ? null : { id: stuId }
    if (stuErr) console.error('Registration: student insert failed —', stuErr)

    // 3. Enroll in each matched class, right now, with a real capacity
    //    check against the live count — this is what lets the confirmation
    //    screen say "you're in" or "you're on the waitlist" immediately.
    //    Each insert's error is checked — a failed enrollment now shows up
    //    honestly as an error in the results, instead of silently reporting
    //    "enrolled" while nothing was actually written to the database.
    const results = []
    if (stu) {
      for (const cls of matchedClasses) {
        let status = 'enrolled'
        if (cls.capacity) {
          const { count } = await supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('class_id', cls.id).eq('status', 'enrolled')
          if ((count ?? 0) >= cls.capacity) status = 'waitlist'
        }
        const { error: enrollErr } = await supabase.from('enrollments').insert({ student_id: stu.id, class_id: cls.id, status })
        if (enrollErr) {
          console.error('Registration: enrollment insert failed —', cls.name, enrollErr)
          results.push({ name: cls.name, when: cls.when, status: 'error' })
        } else {
          results.push({ name: cls.name, when: cls.when, status })
        }
      }
    } else {
      // Hard failure: no student record means there is nothing to enroll and
      // nothing for Corrie to work with. Do NOT show the success screen or
      // send a "You're in!" email — that's what made this bug invisible
      // before. The raw registration IS still logged above, so Corrie can
      // see the attempt in Admin -> Registrations and add them by hand.
      console.error('Registration: no student record was created — aborting before confirmation.')
      setErr('Something went wrong saving your registration, and your dancer was NOT added. Please email Corrie directly at shineGHFC@gmail.com so she can add your dancer by hand. Sorry for the hassle!')
      setBusy(false)
      return
    }

    // 4. Send the two registration emails (internal alert to Corrie, and
    //    the parent confirmation). This calls a Netlify Function, not a
    //    Supabase Edge Function and not a database webhook:
    //      - The database webhook could not be created at all (Supabase
    //        platform error: schema "supabase_functions" does not exist).
    //      - Supabase Edge Functions block outbound SMTP ports, so Gmail
    //        sending could never work from there regardless.
    //    Netlify does not block those ports, so this is where it works.
    //
    //    Deliberately wrapped and deliberately last: if email fails for
    //    any reason, the family's registration and enrollment have ALREADY
    //    completed successfully above, and they still see their real
    //    confirmation screen. Email trouble must never cost someone a spot.
    try {
      await fetch('/.netlify/functions/notify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record: regRow,
          outcomes: results,
          // Whatever the parent actually saw on screen (from Site Content),
          // not a second hardcoded copy that could drift out of sync — this
          // is the fix for the wrong-meeting-date bug from last round.
          meeting_labels: { aug28: sc.meeting_aug28_label, sep3: sc.meeting_sep3_label },
        }),
      })
    } catch { /* registration already succeeded — nothing to undo */ }

    setOutcomes(results)
    setBusy(false)
    setDone(true)
  }

  return (
    <section className="register" id="register">
      <div className="section">
        <div>
          <span className="eyebrow">Registration</span>
          <h2>Ready to join us?</h2>
          <p className="lead">{sc.registration_intro}</p>
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
              <p>Thanks, {form.parent_name.split(' ')[0]}! Here's where {form.student_name.split(' ')[0]} landed:</p>
              {outcomes.length > 0 ? (
                <div className="outcome-list">
                  {outcomes.map((o, i) => (
                    <div key={i} className={`outcome-row ${o.status}`}>
                      <span className="outcome-name"><strong>{o.name}</strong>{o.when && <span className="outcome-when"> · {o.when}</span>}</span>
                      <span className={`pill ${o.status === 'enrolled' ? 'enrolled' : o.status === 'error' ? 'danger' : 'waitlist'}`}>
                        {o.status === 'enrolled' ? "You're enrolled!" : o.status === 'error' ? "Couldn't save — Corrie will follow up" : 'Waitlisted — full'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 14.5, color: 'var(--ink-soft)' }}>Corrie will follow up to help pick the right class for {form.student_name.split(' ')[0]}.</p>
              )}
              <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 14 }}>Remember: enrollment isn't complete until a parent attends one of the two meeting dates. A confirmation email is on its way with the details.</p>
              {form.wants_donation && (
                <div className="donate-cta">
                  <p style={{ fontSize: 14.5, marginBottom: 10 }}>You noted you'd like to make a $100 registration donation — thank you! You can complete that here whenever's convenient:</p>
                  <a href={REGISTRATION_DONATION_URL} target="_blank" rel="noreferrer" className="btn-primary">Complete registration donation</a>
                </div>
              )}
              <button
                className="btn-primary"
                style={{ marginTop: 18 }}
                onClick={() => { setForm(BLANK_FORM); setOutcomes([]); setDone(false); setErr('') }}
              >
                Register another student
              </button>
            </div>
          ) : (
            <>
              <h3>Register your dancer</h3>
              <p className="sub">Sign up or join the waiting list — we'll take it from there.</p>
              {err && <div className="form-err">{err}</div>}

              <p className="form-section-label">Is your dancer new to Shine, or returning?</p>
              <div className="class-check-list" style={{ display: 'flex', gap: 0 }}>
                <label className="class-check-row" style={{ flex: 1 }}>
                  <input type="radio" name="is_returning" checked={form.is_returning === 'new'} onChange={() => setForm({ ...form, is_returning: 'new' })} />
                  <span>New student</span>
                </label>
                <label className="class-check-row" style={{ flex: 1 }}>
                  <input type="radio" name="is_returning" checked={form.is_returning === 'returning'} onChange={() => setForm({ ...form, is_returning: 'returning' })} />
                  <span>Returning student</span>
                </label>
              </div>

              <p className="form-section-label">Parent / Guardian (Primary)</p>
              <div className="fg">
                <label>Your name *</label>
                <input type="text" placeholder="Your name" value={form.parent_name} onChange={set('parent_name')} required />
              </div>
              <div className="fg2">
                <div className="fg"><label>Email *</label><input type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required /></div>
                <div className="fg"><label>Phone *</label><input type="tel" placeholder="(000) 000-0000" value={form.phone} onChange={set('phone')} required /></div>
              </div>

              <p className="form-section-label">Parent / Guardian (Secondary — optional)</p>
              <div className="fg">
                <label>Name</label>
                <input type="text" placeholder="Optional" value={form.secondary_parent_name} onChange={set('secondary_parent_name')} />
              </div>
              <div className="fg2">
                <div className="fg"><label>Email</label><input type="email" placeholder="Optional" value={form.secondary_parent_email} onChange={set('secondary_parent_email')} /></div>
                <div className="fg"><label>Phone</label><input type="tel" placeholder="Optional" value={form.secondary_parent_phone} onChange={set('secondary_parent_phone')} /></div>
              </div>

              <p className="form-section-label">Emergency Contact (other than a parent)</p>
              <div className="fg2">
                <div className="fg"><label>Name *</label><input type="text" value={form.emergency_contact_name} onChange={set('emergency_contact_name')} required /></div>
                <div className="fg"><label>Relationship *</label><input type="text" placeholder="e.g. Grandparent, neighbor" value={form.emergency_contact_relationship} onChange={set('emergency_contact_relationship')} required /></div>
              </div>
              <div className="fg">
                <label>Phone *</label>
                <input type="tel" value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} required />
              </div>

              <p className="form-section-label">Dancer</p>
              <div className="fg2">
                <div className="fg"><label>Child's name *</label><input type="text" placeholder="Dancer's name" value={form.student_name} onChange={set('student_name')} required /></div>
                <div className="fg"><label>Grade *</label><input type="text" placeholder="e.g. 4th" value={form.student_grade} onChange={set('student_grade')} required /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label>Age *</label><input type="text" placeholder="e.g. 8" value={form.student_age} onChange={set('student_age')} required /></div>
                <div className="fg"><label>Student birthday *</label><input type="date" value={form.student_birthday} onChange={set('student_birthday')} required /></div>
              </div>
              <div className="fg">
                <label>How did you hear about us? *</label>
                <select value={form.heard_about} onChange={set('heard_about')} required>
                  <option value="">Select one…</option>
                  {HEARD_ABOUT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                {form.heard_about === 'Other' && (
                  <input type="text" style={{ marginTop: 8 }} placeholder="Please tell us more" value={form.heard_about_other} onChange={set('heard_about_other')} />
                )}
              </div>
              <div className="fg">
                <label>{sc.class_select_label} *</label>
                <div className="class-check-list">
                  {liveClasses
                    ? liveClasses.map((c) => (
                        <label key={c.id} className="class-check-row">
                          <input type="checkbox" checked={form.interested_classes.includes(c.id)} onChange={() => toggleClass(c.id)} disabled={form.not_sure} />
                          <span>
                            <strong>{c.name}</strong>{c.level ? ` (${c.level})` : ''}{c.full && <span className="full-tag" style={{ marginLeft: 6 }}>Full — waitlist</span>}
                            <br /><span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{[c.when, c.ageRange].filter(Boolean).join(' · ')}</span>
                          </span>
                        </label>
                      ))
                    : CLASS_OPTIONS.slice(1).map((c) => (
                        <label key={c} className="class-check-row">
                          <input type="checkbox" checked={form.interested_classes.includes(c)} onChange={() => toggleClass(c)} disabled={form.not_sure} />
                          <span>{c}</span>
                        </label>
                      ))}
                </div>
                <label className="check" style={{ marginTop: 10 }}>
                  <input
                    type="checkbox"
                    checked={form.not_sure}
                    onChange={(e) => setForm((f) => ({ ...f, not_sure: e.target.checked, interested_classes: e.target.checked ? [] : f.interested_classes }))}
                  />
                  <span>{sc.not_sure_label}</span>
                </label>
              </div>

              <p className="form-section-label">Mandatory Parent Meeting</p>
              <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 8 }}>I plan to attend the Mandatory Parent Meeting on:</p>
              <label className="check"><input type="checkbox" checked={form.meeting_aug28} onChange={set('meeting_aug28')} /><span>{sc.meeting_aug28_label}</span></label>
              {/* Field name "meeting_sep3" is a historical internal key — the
                  actual date/time shown to parents is sc.meeting_sep3_label,
                  edited via Admin → Site Content. Do not rename this field
                  to match the label; the label is what's meant to change. */}
              <label className="check"><input type="checkbox" checked={form.meeting_sep3} onChange={set('meeting_sep3')} /><span>{sc.meeting_sep3_label}</span></label>
              <label className="check"><input type="checkbox" checked={form.meeting_acknowledged} onChange={set('meeting_acknowledged')} /><span>I understand my student's enrollment with Shine is <strong>NOT complete</strong> until a parent or guardian attends one of the above meeting dates.</span></label>

              <p className="form-section-label">Registration Donation</p>
              <label className="check"><input type="checkbox" checked={form.wants_donation} onChange={set('wants_donation')} /><span>I understand Shine is run completely by volunteers and donations. I would like to make a registration donation (suggested amount: $100 per family).</span></label>

              <label className="check" style={{ marginTop: 14 }}>
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
          <a href="/#register">Register a dancer</a>
          <a href="/#classes">View classes</a>
          <a href="/policies">Policies &amp; Forms</a>
          <a href="https://pushpay.com/g/ghfclamirada" target="_blank" rel="noreferrer">Give through GHFC</a>
        </div>
      </div>
      <div className="foot-bottom">Shine Dance Studio · Granada Heights Friends Church</div>
    </footer>
  )
}

// Renders plain text with blank-line paragraph breaks and "•" bullet lines
// as a real list — matches what the admin's Policies editor produces
// without needing a rich text editor.
function PolicyBody({ text }) {
  const blocks = text.split(/\n\s*\n/)
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim())
        const isList = lines.length > 0 && lines.every((l) => l.trim().startsWith('•'))
        if (isList) {
          return (
            <ul key={i} className="policy-list">
              {lines.map((l, j) => <li key={j}>{l.replace(/^•\s*/, '')}</li>)}
            </ul>
          )
        }
        return <p key={i}>{lines.join(' ')}</p>
      })}
    </>
  )
}

function PoliciesPage() {
  const [sections, setSections] = useState(null)
  useEffect(() => {
    if (!supabase) { setSections([]); return }
    ;(async () => {
      const { data } = await supabase.from('policy_sections').select('*').eq('active', true).order('sort_order')
      setSections(data || [])
    })()
  }, [])
  return (
    <>
      <Nav />
      <div className="policies-page">
        <div className="policies-in">
          <a href="/" className="policies-back">← Back to Shine</a>
          <span className="eyebrow">Policies &amp; Forms</span>
          <h1>What to know before class starts</h1>
          {sections === null ? (
            <p className="policies-loading">Loading…</p>
          ) : sections.length === 0 ? (
            <p>Nothing posted yet — check back soon, or email Corrie at shineGHFC@gmail.com with any questions.</p>
          ) : (
            sections.map((s) => (
              <section className="policy-section" key={s.id}>
                <h2>{s.title}</h2>
                <PolicyBody text={s.body} />
              </section>
            ))
          )}
          <p className="policies-contact">Questions about any of this? Email Corrie Villa at <a href="mailto:shineGHFC@gmail.com">shineGHFC@gmail.com</a>.</p>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default function App() {
  const isPolicies = typeof window !== 'undefined' && window.location.pathname.replace(/\/$/, '') === '/policies'
  if (isPolicies) return <PoliciesPage />
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
