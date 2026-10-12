import { useState, useRef } from "react"

// The Worker URL from Cloudflare.
const ENDPOINT = "https://momos-lead-routing.marketing-team-a27.workers.dev"
// Where visitors go if the Worker cannot be reached at all.
const FALLBACK = "/book-a-demo-us"
// The Worker gives Claude 3s to check the lead. This leaves room for the network on top.
const TIMEOUT_MS = 5000
const LEGAL_URL = "/legal"

// One list for every region. The Worker routes on country plus browser time zone.
const COUNTRIES = [
  ["US", "🇺🇸 United States"], ["CA", "🇨🇦 Canada"], ["MX", "🇲🇽 Mexico"],
  ["AU", "🇦🇺 Australia"], ["FR", "🇫🇷 France"], ["DE", "🇩🇪 Germany"], ["HK", "🇭🇰 Hong Kong"],
  ["IN", "🇮🇳 India"], ["ID", "🇮🇩 Indonesia"], ["IE", "🇮🇪 Ireland"], ["IT", "🇮🇹 Italy"],
  ["JP", "🇯🇵 Japan"], ["KW", "🇰🇼 Kuwait"], ["MY", "🇲🇾 Malaysia"], ["NL", "🇳🇱 Netherlands"],
  ["NZ", "🇳🇿 New Zealand"], ["PH", "🇵🇭 Philippines"], ["QA", "🇶🇦 Qatar"], ["SA", "🇸🇦 Saudi Arabia"],
  ["SG", "🇸🇬 Singapore"], ["KR", "🇰🇷 South Korea"], ["ES", "🇪🇸 Spain"], ["TH", "🇹🇭 Thailand"],
  ["TR", "🇹🇷 Turkey"], ["AE", "🇦🇪 United Arab Emirates"], ["GB", "🇬🇧 United Kingdom"],
  ["VN", "🇻🇳 Vietnam"], ["OTHER", "🌍 Other"],
]
const LOCATIONS = ["1-5", "6-49", "50-249", "250+"]

// Momos house style: Poppins, #D73E33 header band, #E0E0E0 card with soft shadow,
// #FAFAFA fields, #FDF2F2 / #F5C5C5 for the picked option, #353D4D body text.
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
.mlf { font-family: 'Poppins', sans-serif; font-size: 16px; color: #353D4D; width: 100%; -webkit-font-smoothing: antialiased; }
.mlf * { box-sizing: border-box; font-family: 'Poppins', sans-serif; }
.mlf-card { margin: 0; background: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 12px; overflow: hidden; box-shadow: 0px 4px 15px rgba(0,0,0,0.08); }
.mlf-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 14px 24px; background: #D73E33; }
.mlf-head-title { font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.85); }
.mlf-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; color: #D73E33; background: #FFFFFF; border-radius: 4px; }
.mlf-body { display: flex; flex-direction: column; gap: 20px; padding: 24px; }
.mlf-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.mlf-field { display: flex; flex-direction: column; gap: 8px; }
.mlf-label { font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #353D4D; }
.mlf-input { width: 100%; height: 48px; padding: 0 16px; font-size: 15px; color: #14181D; background: #FAFAFA; border: 1px solid #EFEFEF; border-radius: 8px; outline: none; transition: border-color .2s, box-shadow .2s, background .2s; }
.mlf-input::placeholder { color: #9AA0AB; }
.mlf-input:hover { border-color: #E0E0E0; }
.mlf-input:focus { background: #FFFFFF; border-color: #D73E33; box-shadow: 0 0 0 3px #FDF2F2; }
select.mlf-input { appearance: none; -webkit-appearance: none; padding-right: 44px; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1.5 6 6.5l5-5' stroke='%23353D4D' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; }
.mlf-chips { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.mlf-chip { display: block; }
.mlf-chip input { position: absolute; opacity: 0; pointer-events: none; }
.mlf-chip span { display: block; padding: 12px 8px; text-align: center; font-size: 15px; font-weight: 500; color: #353D4D; background: #FAFAFA; border: 1px solid #EFEFEF; border-radius: 8px; cursor: pointer; transition: all .2s; }
.mlf-chip:hover span { border-color: #E0E0E0; background: #FFFFFF; }
.mlf-chip input:checked + span { font-weight: 600; color: #D73E33; background: #FDF2F2; border-color: #F5C5C5; }
.mlf-chip input:focus-visible + span { box-shadow: 0 0 0 3px #FDF2F2; border-color: #D73E33; }
.mlf-button { width: 100%; height: 52px; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 16px; font-weight: 600; color: #FFFFFF; background: #D73E33; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0px 4px 15px rgba(215,62,51,0.25); transition: background .2s, transform .2s; }
.mlf-button:hover { background: #AD281F; }
.mlf-button:hover svg { transform: translateX(3px); }
.mlf-button svg { transition: transform .2s; }
.mlf-button:disabled { background: #D73E33; opacity: .8; cursor: default; }
.mlf-foot { padding: 14px 24px; background: #FAFAFA; border-top: 1px solid #EFEFEF; }
.mlf-consent { margin: 0; font-size: 12px; line-height: 1.5; color: #353D4D; text-align: center; }
.mlf-consent a { color: #D73E33; font-weight: 500; text-decoration: underline; text-underline-offset: 3px; }
@media (max-width: 480px) { .mlf-head, .mlf-body, .mlf-foot { padding-left: 16px; padding-right: 16px; } .mlf-chips { grid-template-columns: repeat(2, 1fr); } }
`

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function LeadForm() {
  const [loading, setLoading] = useState(false)
  const loadedAt = useRef(Date.now())

  async function onSubmit(e) {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    const data = Object.fromEntries(new FormData(e.target))
    const params = new URLSearchParams(window.location.search)
    data.elapsedMs = Date.now() - loadedAt.current
    data.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    data.pageUrl = window.location.href
    data.referrer = document.referrer
    ;["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_channel", "gclid"].forEach((k) => {
      if (params.get(k)) data[k] = params.get(k)
    })

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        // text/plain skips the CORS preflight, which saves a full round trip.
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(data),
        signal: ctrl.signal,
      })
      const { url } = await res.json()
      window.top.location.href = url
    } catch {
      window.top.location.href = FALLBACK
    } finally {
      clearTimeout(timer)
    }
  }

  return (
    <div className="mlf">
      <style>{CSS}</style>
      <form onSubmit={onSubmit} className="mlf-card">
        <div className="mlf-head">
          <span className="mlf-head-title">Book a demo</span>
          <span className="mlf-badge">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="#D73E33"><path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7.1L12 17.3 5.7 21.3l1.7-7.1L2 9.5l7.1-.6z" /></svg>
            Takes 30 seconds
          </span>
        </div>
        <div className="mlf-body">
        <input name="website" tabIndex={-1} autoComplete="off" style={{ display: "none" }} />
        <div className="mlf-row">
          <label className="mlf-field">
            <span className="mlf-label">First Name*</span>
            <input className="mlf-input" name="firstName" placeholder="Enter your first name" autoComplete="given-name" required />
          </label>
          <label className="mlf-field">
            <span className="mlf-label">Last Name*</span>
            <input className="mlf-input" name="lastName" placeholder="Enter your last name" autoComplete="family-name" required />
          </label>
        </div>
        <label className="mlf-field">
          <span className="mlf-label">Work Email*</span>
          <input className="mlf-input" name="email" type="email" placeholder="Enter your work email" autoComplete="email" required />
        </label>
        <div className="mlf-row">
          <label className="mlf-field">
            <span className="mlf-label">Company*</span>
            <input className="mlf-input" name="company" placeholder="Enter your company" autoComplete="organization" required />
          </label>
          <label className="mlf-field">
            <span className="mlf-label">Job Title*</span>
            <input className="mlf-input" name="title" placeholder="Enter your job title" autoComplete="organization-title" required />
          </label>
        </div>
        <label className="mlf-field">
          <span className="mlf-label">Country*</span>
          <select className="mlf-input" name="country" required defaultValue="US">
            {COUNTRIES.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </label>
        <div className="mlf-field">
          <span className="mlf-label">How many locations does your restaurant/franchise have?*</span>
          <div className="mlf-chips">
            {LOCATIONS.map((v) => (
              <label key={v} className="mlf-chip">
                <input type="radio" name="locations" value={v} required />
                <span>{v}</span>
              </label>
            ))}
          </div>
        </div>
        <button type="submit" disabled={loading} className="mlf-button">
          {loading ? "Matching you with the right person..." : "Book a demo"}
          {!loading && (
            <svg width="16" height="14" viewBox="0 0 18 15" fill="none">
              <path d="M17.78 8.03 11.03 14.78a.75.75 0 0 1-1.06-1.06l5.47-5.47H.75a.75.75 0 0 1 0-1.5h14.69L9.97 1.28A.75.75 0 0 1 11.03.22l6.75 6.75a.75.75 0 0 1 0 1.06Z" fill="#FFFFFF" />
            </svg>
          )}
        </button>
        </div>
        <div className="mlf-foot">
          <p className="mlf-consent">
            By clicking the button, I agree to Momos <a href={LEGAL_URL}>Terms of Service</a> and <a href={LEGAL_URL}>Privacy Policy</a>
          </p>
        </div>
      </form>
    </div>
  )
}
