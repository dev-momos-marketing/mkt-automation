import { useState, useRef } from "react"

// The Worker URL from Cloudflare.
const ENDPOINT = "https://momos-lead-routing.marketing-team-a27.workers.dev"
// Where visitors go if the Worker cannot be reached at all.
const FALLBACK = "/book-a-demo-us"
// The Worker gives Claude 3s to check the lead. This leaves room for the network on top.
const TIMEOUT_MS = 5000
const TERMS_URL = "https://www.momos.com/legal/terms-of-use"
const PRIVACY_URL = "https://www.momos.com/legal"

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

// Copied from the original momos.com/get-started form: same card, fields, button and text styles.
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');
.mlf { width: 100%; font-family: 'Poppins', 'Poppins Placeholder', sans-serif; color: #15181E; -webkit-font-smoothing: antialiased; }
.mlf * { box-sizing: border-box; font-family: 'Poppins', 'Poppins Placeholder', sans-serif; }
.mlf-card { margin: 0; display: flex; flex-direction: column; gap: 32px; padding: 40px; background: #FFFFFF; border: 1px solid #FBF8F4; border-radius: 20px; box-shadow: 0px 0.6px 2.77px -0.08px rgba(191,187,186,0.03), 0px 2.29px 10.53px -0.17px rgba(191,187,186,0.08), 0px 10px 46px -0.25px rgba(191,187,186,0.28); }
.mlf-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
.mlf-field { display: flex; flex-direction: column; gap: 8px; }
.mlf-label { font-size: 16px; line-height: 1.5; font-weight: 400; color: #15181E; }
.mlf-input { width: 100%; height: 50px; padding: 0 20px; font-size: 16px; line-height: 1.5; font-weight: 400; color: #15181E; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; outline: none; transition: border-color .3s cubic-bezier(.44,0,.56,1); }
.mlf-input::placeholder { color: rgba(0,0,0,0.5); }
.mlf-input:focus { border-color: #D73E33; }
select.mlf-input { appearance: none; -webkit-appearance: none; padding-right: 48px; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%2315181E' stroke-opacity='.5' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 20px center; }
.mlf-chips { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.mlf-chip { display: block; }
.mlf-chip input { position: absolute; opacity: 0; pointer-events: none; }
.mlf-chip span { display: flex; align-items: center; justify-content: center; height: 50px; font-size: 16px; color: #15181E; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; cursor: pointer; transition: all .3s cubic-bezier(.44,0,.56,1); }
.mlf-chip:hover span { border-color: rgba(0,0,0,0.2); }
.mlf-chip input:checked + span { color: #D73E33; font-weight: 500; background: #FFF0F0; border-color: #D73E33; }
.mlf-chip input:focus-visible + span { border-color: #D73E33; }
.mlf-submit { display: flex; flex-direction: column; gap: 20px; }
.mlf-button { width: 100%; height: 48px; padding: 10px 20px 10px 24px; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1.6; font-weight: 600; color: #FFFFFF; background: linear-gradient(139deg, #D73E33 0%, #FF787A 100%); border: 1px solid #D73E33; border-radius: 16px; cursor: pointer; box-shadow: 0px 6px 20px 0px rgba(255,120,122,0.6), 0px 0px 0px 8px rgba(255,120,122,0.08); }
.mlf-button:disabled { opacity: .85; cursor: default; }
.mlf-consent { margin: 0; font-size: 14px; line-height: 1.55; color: #4D4D4D; }
.mlf-consent a { color: #0074D9; text-decoration: underline; }
@media (max-width: 1199px) { .mlf-label { font-size: 12px; } .mlf-button { font-size: 16px; } }
@media (max-width: 809px) { .mlf-card { padding: 24px; gap: 20px; } .mlf-row { grid-template-columns: 1fr; } .mlf-chips { grid-template-columns: repeat(2, 1fr); } .mlf-button { font-size: 14px; } .mlf-consent { font-size: 12px; line-height: 1.5; } }
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
        <div className="mlf-submit">
          <button type="submit" disabled={loading} className="mlf-button">
            {loading ? "Matching you with the right person..." : "Book a Demo"}
          </button>
          <p className="mlf-consent">
            By clicking the button, I agree to Momos{" "}
            <a href={TERMS_URL} target="_blank">Terms of Service</a> and{" "}
            <a href={PRIVACY_URL} target="_blank">Privacy Policy</a>
          </p>
        </div>
      </form>
    </div>
  )
}
