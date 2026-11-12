// Shine — recital ticket confirmation email.
//
// Called by the public tickets page right after a family reserves. It
// sends that family one email saying what they got.
//
// HOW THIS STAYS SAFE WITHOUT A LOGIN:
// This endpoint is public (anonymous families call it), so it must not
// trust anything the browser tells it. The browser sends only the ids of
// the reservation it just made. Everything else, including WHO gets the
// email and WHAT it says, comes from the database through
// claim_ticket_confirmation():
//   - it only answers for a reservation made in the last 15 minutes,
//   - it only answers ONCE per reservation, so replaying a request does
//     nothing,
//   - it only answers while "Allow recital emails to be sent" is switched
//     on in the admin.
// So this cannot be used to send arbitrary text to arbitrary addresses.
// The one thing a visitor controls is the parent name they typed, which
// the database caps at 80 characters and this file escapes.
//
// No service-role key is used or needed here. This site must never have
// one.
//
// Environment variables on the shine-public Netlify site (all already set
// for registration emails, nothing new to add):
//   GMAIL_ADDRESS, GMAIL_APP_PASSWORD
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
//   ALLOWED_ORIGIN   optional, same meaning as in notify-registration.mjs

import nodemailer from 'nodemailer'

const DEFAULT_SUBJECT = 'Your Shine recital tickets: {show_name}'
const DEFAULT_BODY = "Hi {parent_name},\n\nYou are confirmed for {ticket_count} ticket(s) to {show_name} on {show_date} at {show_time}.\n\nWe can't wait to see you there!\n\nShine Dance Studio"
const DEFAULT_WAITLIST_SUBJECT = 'You are on the waitlist: {show_name}'
const DEFAULT_WAITLIST_BODY = "Hi {parent_name},\n\n{show_name} on {show_date} at {show_time} is currently full, so the {waitlist_count} ticket(s) you asked for are on the waitlist. You do not have confirmed seats yet. We will reach out if seats open up.\n\nShine Dance Studio"
const DEFAULT_WAITLIST_NOTE = 'Please note: {waitlist_count} more ticket(s) you asked for are on the waitlist because the show filled up. We will reach out if seats open.'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Only plain addresses are ever handed to the mail library. Addresses
// come from public forms, and the older mail library this site runs has
// known flaws in how it reads unusual ones (quotes, comments, semicolons,
// angle brackets), where display text can end up treated as a second
// recipient. A plain name@domain address cannot trigger any of that.
const SAFE_EMAIL = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/
const isSafeEmail = (e) => typeof e === 'string' && e.length <= 254 && SAFE_EMAIL.test(e)

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' })

  const gmailAddress = process.env.GMAIL_ADDRESS
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const allowedOrigin = process.env.ALLOWED_ORIGIN

  if (!gmailAddress || !gmailAppPassword || !supabaseUrl || !supabaseAnonKey) {
    console.error('send-ticket-confirmation: missing GMAIL_ADDRESS, GMAIL_APP_PASSWORD, VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
    return json(500, { ok: false, error: 'Email not configured' })
  }
  if (allowedOrigin) {
    const origin = event.headers.origin || event.headers.referer || event.headers.Referer || ''
    if (origin && !origin.startsWith(allowedOrigin)) {
      console.error(`send-ticket-confirmation: rejected request from unexpected origin "${origin}"`)
      return json(403, { ok: false, error: 'Forbidden' })
    }
  }

  let ids
  try { ids = JSON.parse(event.body || '{}').ids } catch { return json(400, { ok: false, error: 'Bad request body' }) }
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 2 || !ids.every((x) => typeof x === 'string' && UUID.test(x))) {
    return json(400, { ok: false, error: 'Bad reservation ids' })
  }

  // Ask the database what (if anything) to send. This also marks the
  // reservation as emailed, so a second call gets "nothing to send".
  let claim
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/claim_ticket_confirmation`, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_ids: ids }),
    })
    if (!res.ok) {
      console.error('send-ticket-confirmation: claim failed —', res.status, await res.text().catch(() => ''))
      return json(500, { ok: false, error: 'Could not look up the reservation' })
    }
    claim = await res.json()
  } catch (e) {
    console.error('send-ticket-confirmation: could not reach the database —', e)
    return json(500, { ok: false, error: 'Could not look up the reservation' })
  }

  // Emails switched off, an old reservation, or one already emailed. Not
  // an error: the reservation itself is saved either way.
  if (!claim?.send) return json(200, { ok: true, sent: false, reason: claim?.reason || 'nothing_to_send' })
  if (!isSafeEmail(claim.email)) {
    console.error('send-ticket-confirmation: the reservation email is not a plain name@domain address, nothing sent —', String(claim.email || '').slice(0, 80))
    return json(200, { ok: true, sent: false, reason: 'bad_address' })
  }

  const confirmed = Number(claim.confirmed) || 0
  const waitlisted = Number(claim.waitlisted) || 0
  const showDate = claim.show_date
    ? new Date(claim.show_date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
    : 'the scheduled date'
  const fill = (text) => String(text || '')
    .replaceAll('{parent_name}', claim.parent_name || 'there')
    .replaceAll('{ticket_count}', String(confirmed))
    .replaceAll('{waitlist_count}', String(waitlisted))
    .replaceAll('{show_name}', claim.show_name || 'the recital')
    .replaceAll('{show_date}', showDate)
    .replaceAll('{show_time}', claim.show_time || 'the scheduled time')

  // All wording comes from the admin (Recital Tickets > Settings &
  // Release), with built-in text as the fallback when a box is blank.
  let subject, message
  if (confirmed > 0) {
    subject = fill(claim.subject || DEFAULT_SUBJECT)
    message = fill(claim.body || DEFAULT_BODY)
    // Part of the request was waitlisted: add the waitlist line.
    if (waitlisted > 0) message += '\n\n' + fill(claim.waitlist_note || DEFAULT_WAITLIST_NOTE)
  } else {
    // Nothing confirmed, so the confirmation wording would be wrong. The
    // separate waitlist email goes out instead.
    subject = fill(claim.waitlist_subject || DEFAULT_WAITLIST_SUBJECT)
    message = fill(claim.waitlist_body || DEFAULT_WAITLIST_BODY)
  }

  // The ticket itself, in the email, so a family can print the email or
  // show it on a phone at the door. Built with a plain table and inline
  // styles because that is what email programs render reliably. Only for
  // confirmed tickets: a waitlisted family has no seats to show a ticket for.
  const ticketHtml = confirmed > 0 ? `
        <table role="presentation" cellpadding="0" cellspacing="0" style="border:3px solid #1c2250;border-radius:12px;margin:22px 0 6px;color:#1c2250;font-family:Georgia,'Times New Roman',serif;border-collapse:separate">
          <tr>
            <td style="padding:16px 20px;vertical-align:top">
              <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:bold">Shine Dance Studio &middot; Recital Ticket</div>
              <div style="font-size:18px;font-weight:bold;margin-top:6px">${escapeHtml(claim.show_name || 'Recital')}</div>
              <div style="font-size:46px;font-weight:bold;line-height:1.1">${escapeHtml(claim.show_time || '')}</div>
              <div style="font-size:17px">${escapeHtml(showDate)}</div>
              <div style="font-size:13px;color:#333;margin-top:8px">${escapeHtml(claim.parent_name || '')}</div>
            </td>
            <td style="padding:16px 18px;text-align:center;vertical-align:middle;border-left:3px dashed #1c2250">
              <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:bold">Admit</div>
              <div style="font-size:50px;font-weight:bold;line-height:1">${confirmed}</div>
              <div style="font-size:12px">${confirmed === 1 ? 'guest' : 'guests'}</div>
            </td>
          </tr>
        </table>
        <p style="font-size:13px;color:#555;margin:0 0 4px">This is your ticket. Print this email or show it on your phone at the door. Good for this performance only.</p>` : ''

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: gmailAddress, pass: gmailAppPassword },
      connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 8000,
    })
    await transporter.sendMail({
      from: `"Shine Dance Studio" <${gmailAddress}>`,
      to: claim.email,
      replyTo: gmailAddress,
      subject: subject.replace(/[\r\n]+/g, ' ').slice(0, 200),
      text: message,
      html: `<div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">
        ${escapeHtml(message).replace(/\n/g, '<br>')}
        ${ticketHtml}
        <hr style="border:none;border-top:1px solid #ddd;margin:22px 0">
        <p style="font-size:13px;color:#666;margin:0">Shine Dance Studio &middot; a ministry of Granada Heights Friends Church</p>
      </div>`,
    })
    return json(200, { ok: true, sent: true })
  } catch (e) {
    // The reservation is already marked as emailed, so this one will not
    // be retried. It is logged here so a pattern is visible in Netlify.
    console.error('send-ticket-confirmation: send failed —', e)
    return json(500, { ok: false, error: String(e && e.message ? e.message : e) })
  }
}

function json(statusCode, payload) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
}
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
