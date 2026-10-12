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

// Momos Brand Guidelines v4 tokens.
const CSS = `
.mlf { font-family: 'Poppins', sans-serif; color: #14181D; width: 100%; }
.mlf * { box-sizing: border-box; font-family: inherit; }
.mlf-card { background: #FFFFFF; border-radius: 16px; padding: 32px; box-shadow: 0px 4px 15px rgba(0,0,0,0.08); display: flex; flex-direction: column; gap: 24px; }
.mlf-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.mlf-field { display: flex; flex-direction: column; gap: 8px; }
.mlf-label { font-size: 16px; line-height: 1.5; font-weight: 500; color: #353D4D; }
.mlf-input { width: 100%; padding: 12px 16px; font-size: 16px; line-height: 1.5; color: #14181D; background: #F9F9F9; border: 1px solid #E0E0E0; border-radius: 4px; outline: none; transition: border-color .15s, box-shadow .15s, background .15s; }
.mlf-input::placeholder { color: #A0A0A0; }
.mlf-input:focus { background: #FFFFFF; border-color: #D73E33; box-shadow: 0 0 0 3px #FFEBEB; }
select.mlf-input { appearance: none; padding-right: 40px; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1.5 6 6.5l5-5' stroke='%23535862' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; }
.mlf-chips { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.mlf-chip input { position: absolute; opacity: 0; pointer-events: none; }
.mlf-chip span { display: block; text-align: center; padding: 12px 8px; font-size: 16px; line-height: 1.5; color: #353D4D; background: #F9F9F9; border: 1px solid #E0E0E0; border-radius: 4px; cursor: pointer; transition: all .15s; }
.mlf-chip:hover span { border-color: #FF787A; }
.mlf-chip input:checked + span { background: #FFEBEB; border-color: #D73E33; color: #D73E33; font-weight: 500; }
.mlf-chip input:focus-visible + span { box-shadow: 0 0 0 3px #FFEBEB; }
.mlf-button { width: 100%; padding: 12px 24px; font-size: 20px; line-height: 1.6; font-weight: 500; color: #FFFFFF; background: #D73E33; border: none; border-radius: 4px; cursor: pointer; box-shadow: 0px 4px 15px rgba(0,0,0,0.08); transition: background .15s; }
.mlf-button:hover { background: #C2352B; }
.mlf-button:disabled { opacity: .8; cursor: default; }
.mlf-consent { margin: 0; font-size: 14px; line-height: 1.6; color: #535862; text-align: center; }
.mlf-consent a { color: #D73E33; }
@media (max-width: 480px) { .mlf-card { padding: 24px 16px; } .mlf-chips { grid-template-columns: repeat(2, 1fr); } }
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
          {loading ? "Matching you with the right person..." : "Book a Demo"}
        </button>
        <p className="mlf-consent">
          By clicking the button, I agree to Momos <a href={LEGAL_URL}>Terms of Service</a> and <a href={LEGAL_URL}>Privacy Policy</a>
        </p>
      </form>
    </div>
  )
}
