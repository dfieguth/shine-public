// Shine — registration emails (internal alert + parent confirmation).
//
// WHY THIS LIVES HERE:
// This was originally a Supabase Edge Function triggered by a database
// webhook. Two separate things made that impossible:
//   1. The webhook could not be created at all — Supabase returned
//      ERROR 3F000: schema "supabase_functions" does not exist.
//   2. Even bypassed, Supabase Edge Functions block outbound SMTP ports
//      (25/465/587), so Gmail sending would hang and be killed silently.
// Netlify does not block those ports. Same Gmail app password, new home.
//
// Environment variables needed on the shine-public Netlify site:
//   GMAIL_ADDRESS        shineGHFC@gmail.com
//   GMAIL_APP_PASSWORD   the 16-character app password, NO SPACES
//   NOTIFY_EMAIL         where Corrie's alert goes (defaults to GMAIL_ADDRESS)

import nodemailer from 'nodemailer'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' })
  }

  const gmailAddress = process.env.GMAIL_ADDRESS
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD
  const notifyTo = process.env.NOTIFY_EMAIL || gmailAddress

  if (!gmailAddress || !gmailAppPassword) {
    console.error('notify-registration: missing GMAIL_ADDRESS or GMAIL_APP_PASSWORD env vars')
    return json(500, { ok: false, error: 'Email not configured' })
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { ok: false, error: 'Bad request body' })
  }

  const r = body.record || {}
  const outcomes = Array.isArray(body.outcomes) ? body.outcomes : []

  const parentName = str(r.parent_name) || 'A parent'
  const studentName = str(r.student_name) || 'a student'
  const parentEmail = str(r.email)

  // Split into three groups so the email can say something true and
  // specific about each, instead of one flat list that doesn't distinguish
  // "you're in" from "you're waitlisted." A class name + when, formatted
  // as "Name, Day Time" per Corrie's template.
  const classLabel = (o) => [str(o.name), str(o.when)].filter(Boolean).join(', ')
  const enrolledOutcomes = outcomes.filter((o) => o.status === 'enrolled')
  const waitlistedOutcomes = outcomes.filter((o) => o.status === 'waitlist')
  const errorOutcomes = outcomes.filter((o) => o.status === 'error')

  // Kept for the internal alert to Corrie, which still wants one flat scan.
  const classLines = outcomes.length
    ? outcomes.map((o) => {
        const when = str(o.when) ? ` · ${str(o.when)}` : ''
        const status = o.status === 'error' ? '⚠️ COULD NOT SAVE — needs manual follow-up' : o.status === 'waitlist' ? 'Waitlisted (class is full)' : "You're enrolled!"
        return `${str(o.name)}${when} — ${status}`
      })
    : (str(r.interested_class) ? [str(r.interested_class)] : ['No classes selected yet'])

  // Meeting labels come from the frontend, which reads them live from
  // Admin -> Site Content — this is the single source of truth now. Falling
  // back to these hardcoded defaults only if an older frontend build ever
  // calls this function without them, so this never breaks outright.
  const MEETINGS = {
    aug28: str(body.meeting_labels?.aug28) || 'Friday, August 28th, 6:00–7:00pm (Lindley Hall)',
    sep3: str(body.meeting_labels?.sep3) || 'Wednesday, September 2nd, 7:00–8:00pm (Joy Hall)',
  }

  const meetings = [r.meeting_aug28 && MEETINGS.aug28, r.meeting_sep3 && MEETINGS.sep3]
    .filter(Boolean).join(' and ')

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: gmailAddress, pass: gmailAppPassword },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  })

  const problems = []

  // --- 1. Internal alert to Corrie --------------------------------------
  try {
    const adminLines = [
      `Student: ${studentName}`,
      `Parent: ${parentName}`,
      parentEmail ? `Email: ${parentEmail}` : null,
      str(r.phone) ? `Phone: ${str(r.phone)}` : null,
      str(r.student_grade) ? `Grade: ${str(r.student_grade)}` : null,
      str(r.student_age) ? `Age: ${str(r.student_age)}` : null,
      r.is_returning ? 'Returning student' : 'New student',
      str(r.heard_about) ? `Heard about us: ${str(r.heard_about)}` : null,
      '',
      'Classes:',
      ...classLines.map((l) => `  • ${l}`),
      '',
      meetings ? `Parent meeting selected: ${meetings}` : 'No parent meeting selected',
      r.wants_donation ? 'Interested in donating' : null,
    ].filter((l) => l !== null)

    await transporter.sendMail({
      from: `"Shine Dance Studio" <${gmailAddress}>`,
      to: notifyTo,
      replyTo: parentEmail || gmailAddress,
      subject: `New Shine registration: ${studentName}`,
      text: adminLines.join('\n'),
      html: wrapHtml(`<h2 style="margin:0 0 14px;font-size:19px">New registration</h2>
        ${adminLines.map((l) => (l === '' ? '<br>' : `<div>${escapeHtml(l)}</div>`)).join('')}`),
    })
  } catch (e) {
    // THE FIX: this used to be caught and silently added to `problems`
    // with nothing ever printed anywhere. console.error is what actually
    // makes a failure show up in Netlify's function logs — without this,
    // a real, correctly-detected failure was completely invisible.
    console.error(`notify-registration: admin alert email failed for student "${studentName}" —`, e)
    problems.push(`admin: ${msg(e)}`)
  }

  // --- 2. Confirmation to the parent ------------------------------------
  if (parentEmail) {
    try {
      const parentText = [
        `Hi ${parentName},`,
        '',
        `Thank you for registering ${studentName} with Shine Dance Studio! Here's where things stand:`,
        '',
        ...(enrolledOutcomes.length ? [
          `You're enrolled in:`,
          ...enrolledOutcomes.map((o) => `  • ${classLabel(o)}`),
          '',
        ] : []),
        ...(waitlistedOutcomes.length ? [
          ...waitlistedOutcomes.map((o) =>
            `Thank you for registering for the "${classLabel(o)}" Waitlist. I'm sorry we were unable to reserve a spot in this class for you. As spots become available, we will contact the next student on the waitlist.`
          ),
          'Please contact Corrie at shineGHFC@gmail.com if you have any questions.',
          '',
        ] : []),
        ...(errorOutcomes.length ? [
          `We ran into a problem saving the following — Corrie will follow up directly, no action needed from you:`,
          ...errorOutcomes.map((o) => `  • ${classLabel(o)}`),
          '',
        ] : []),
        'Step 2 is to attend ONE of our two mandatory parent meetings:',
        `  • ${MEETINGS.aug28}`,
        `  • ${MEETINGS.sep3}`,
        ...(meetings ? ['', `You selected: ${meetings}`] : []),
        '',
        'Please note: if a parent does not attend one of the two meetings, we will remove your child from the roster.',
        '',
        'If you have any questions/concerns about your above registration, please reply to this email. We are happy to help.',
        '',
        'Grace and Peace,',
        'Corrie Villa',
        'Shine Dance Studio, a ministry of Granada Heights Friends Church',
      ].join('\n')

      const subject = enrolledOutcomes.length
        ? `You're in! Next steps for ${studentName} at Shine`
        : waitlistedOutcomes.length
          ? `You have been waitlisted for a Shine Class`
          : `Your Shine registration for ${studentName}`

      await transporter.sendMail({
        from: `"Shine Dance Studio" <${gmailAddress}>`,
        to: parentEmail,
        replyTo: gmailAddress,
        subject,
        text: parentText,
        html: wrapHtml(`<p style="margin:0 0 14px">Hi ${escapeHtml(parentName)},</p>
          <p style="margin:0 0 14px">Thank you for registering <strong>${escapeHtml(studentName)}</strong> with Shine Dance Studio! Here's where things stand:</p>
          ${enrolledOutcomes.length ? `<p style="margin:0 0 6px"><strong>You're enrolled in:</strong></p>
          <ul style="margin:0 0 16px;padding-left:20px">
            ${enrolledOutcomes.map((o) => `<li style="margin-bottom:6px">${escapeHtml(classLabel(o))}</li>`).join('')}
          </ul>` : ''}
          ${waitlistedOutcomes.length ? `${waitlistedOutcomes.map((o) => `<p style="margin:0 0 10px">Thank you for registering for the "${escapeHtml(classLabel(o))}" Waitlist. I'm sorry we were unable to reserve a spot in this class for you. As spots become available, we will contact the next student on the waitlist.</p>`).join('')}
          <p style="margin:0 0 16px">Please contact Corrie at shineGHFC@gmail.com if you have any questions.</p>` : ''}
          ${errorOutcomes.length ? `<p style="margin:0 0 6px"><strong>We ran into a problem saving the following</strong> — Corrie will follow up directly, no action needed from you:</p>
          <ul style="margin:0 0 16px;padding-left:20px">
            ${errorOutcomes.map((o) => `<li style="margin-bottom:6px">${escapeHtml(classLabel(o))}</li>`).join('')}
          </ul>` : ''}
          <p style="margin:0 0 8px"><strong>Step 2 is to attend ONE of our two mandatory parent meetings:</strong></p>
          <ul style="margin:0 0 14px;padding-left:20px">
            <li style="margin-bottom:6px">${escapeHtml(MEETINGS.aug28)}</li>
            <li style="margin-bottom:6px">${escapeHtml(MEETINGS.sep3)}</li>
          </ul>
          ${meetings ? `<p style="margin:0 0 14px">You selected: ${escapeHtml(meetings)}</p>` : ''}
          <p style="margin:0 0 14px">Please note: if a parent does not attend one of the two meetings, we will remove your child from the roster.</p>
          <p style="margin:0 0 14px">If you have any questions/concerns about your above registration, please reply to this email. We are happy to help.</p>
          <p style="margin:0">Grace and Peace,<br>Corrie Villa</p>`),
      })
    } catch (e) {
      console.error(`notify-registration: parent confirmation email failed for "${parentEmail}" (student "${studentName}") —`, e)
      problems.push(`parent: ${msg(e)}`)
    }
  }

  if (problems.length) {
    console.error(`notify-registration: completed with ${problems.length} problem(s) — ${problems.join(' | ')}`)
    return json(500, { ok: false, error: problems.join(' | ') })
  }
  return json(200, { ok: true })
}

function wrapHtml(inner) {
  return `<div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">
    ${inner}
    <hr style="border:none;border-top:1px solid #ddd;margin:22px 0">
    <p style="font-size:13px;color:#666;margin:0">Shine Dance Studio &middot; a ministry of Granada Heights Friends Church</p>
  </div>`
}

function str(v) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function msg(e) {
  return String(e && e.message ? e.message : e)
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
