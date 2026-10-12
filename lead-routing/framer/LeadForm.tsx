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

// Styling copied from momos.com (Poppins, brand red, 20px cards, 12px fields, gradient CTA).
const CSS = `
.mlf { font-family: 'Poppins', 'Poppins Placeholder', sans-serif; color: #15181E; width: 100%; -webkit-font-smoothing: antialiased; }
.mlf * { box-sizing: border-box; font-family: inherit; }
.mlf-card { background: #FFFFFF; border: 1px solid rgba(10,11,11,0.1); border-radius: 20px; padding: 32px; display: flex; flex-direction: column; gap: 20px; }
.mlf-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.mlf-field { display: flex; flex-direction: column; gap: 8px; }
.mlf-label { font-size: 14px; line-height: 1.56; font-weight: 500; color: #15181E; }
.mlf-input { width: 100%; height: 48px; padding: 0 16px; font-size: 16px; color: #15181E; background: #FBF8F4; border: 1px solid rgba(10,11,11,0.1); border-radius: 12px; outline: none; transition: border-color .2s, box-shadow .2s, background .2s; }
.mlf-input::placeholder { color: #A3A3A3; }
.mlf-input:hover { border-color: rgba(10,11,11,0.2); }
.mlf-input:focus { background: #FFFFFF; border-color: #D73E33; box-shadow: 0 0 0 4px rgba(255,120,122,0.15); }
select.mlf-input { appearance: none; -webkit-appearance: none; padding-right: 44px; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1.5 6 6.5l5-5' stroke='%2315181E' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; }
.mlf-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.mlf-chip input { position: absolute; opacity: 0; pointer-events: none; }
.mlf-chip span { display: inline-block; padding: 8px 18px; font-size: 14px; line-height: 1.56; font-weight: 500; color: #15181E; background: #FFFFFF; border: 1px solid #FF787A; border-radius: 30px; cursor: pointer; transition: all .2s; }
.mlf-chip:hover span { background: #FFF0F0; }
.mlf-chip input:checked + span { background: #D73E33; border-color: #D73E33; color: #FFFFFF; }
.mlf-chip input:focus-visible + span { box-shadow: 0 0 0 4px rgba(255,120,122,0.25); }
.mlf-button { margin-top: 8px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 16px; padding: 12px 16px 12px 32px; font-size: 18px; line-height: 1.6; font-weight: 600; color: #FFFFFF; background: linear-gradient(139deg, #D73E33 0%, #FF787A 100%); border: 1px solid #D73E33; border-radius: 16px; cursor: pointer; box-shadow: 0px 6px 20px 0px rgba(255,120,122,0.6), 0px 0px 0px 8px rgba(255,120,122,0.08); transition: transform .2s, box-shadow .2s; }
.mlf-button:hover { transform: translateY(-1px); box-shadow: 0px 8px 24px 0px rgba(255,120,122,0.7), 0px 0px 0px 8px rgba(255,120,122,0.12); }
.mlf-button:disabled { opacity: .85; cursor: default; transform: none; }
.mlf-arrow { width: 32px; height: 32px; flex: none; display: flex; align-items: center; justify-content: center; background: #FFFFFF; border-radius: 99px; box-shadow: 0px 8px 10px -6px rgba(24,25,27,0.25); transition: transform .2s; }
.mlf-button:hover .mlf-arrow { transform: translateX(3px); }
.mlf-consent { margin: 0; font-size: 12px; line-height: 1.5; color: #4D4D4D; text-align: center; }
.mlf-consent a { color: #D73E33; text-decoration: underline; text-underline-offset: 2px; }
@media (max-width: 480px) { .mlf-card { padding: 20px; } .mlf-button { font-size: 16px; } }
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
            <span className="mlf-arrow">
              <svg width="14" height="12" viewBox="0 0 18 15" fill="none">
                <path d="M17.78 8.03 11.03 14.78a.75.75 0 0 1-1.06-1.06l5.47-5.47H.75a.75.75 0 0 1 0-1.5h14.69L9.97 1.28A.75.75 0 0 1 11.03.22l6.75 6.75a.75.75 0 0 1 0 1.06Z" fill="#D73E33" />
              </svg>
            </span>
          )}
        </button>
        <p className="mlf-consent">
          By clicking the button, I agree to Momos <a href={LEGAL_URL}>Terms of Service</a> and <a href={LEGAL_URL}>Privacy Policy</a>
        </p>
      </form>
    </div>
  )
}
