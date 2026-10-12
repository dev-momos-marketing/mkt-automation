import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"

// The Worker URL from Cloudflare.
const ENDPOINT = "https://momos-lead-routing.marketing-team-a27.workers.dev"
// Where visitors go if the Worker cannot be reached at all.
const FALLBACK = "/book-a-demo-us"
// The Worker gives Claude 3s to check the lead. This leaves room for the network on top.
const TIMEOUT_MS = 5000
const TERMS_URL = "https://www.momos.com/legal/terms-of-use"
const PRIVACY_URL = "https://www.momos.com/legal"
// Not-fit and spam leads get a thank-you popup instead of leaving the page.
const NOT_FIT_PATH = "/thank-you"
const SALES_EMAIL = "sales@momos.com"

// Every country. Names and flags come from the browser, so this is just ISO codes.
// The Worker routes on country plus browser time zone (see worker/src/route.ts).
const CODES = (
  "US CA MX AR BO BR CL CO CR CU DO EC SV GT HN JM NI PA PY PE PR TT UY VE BS BB BZ GY SR HT AG DM GD KN LC VC AW CW KY BM TC VG VI " +
  "GB IE FR DE ES PT IT NL BE LU CH AT DK SE NO FI IS PL CZ SK HU RO BG GR CY MT SI HR RS BA ME MK AL XK EE LV LT UA MD BY RU AD MC SM LI VA GI JE GG IM " +
  "AE SA QA KW BH OM IL JO LB IQ IR TR YE PS SY AM AZ GE KZ KG TJ TM UZ " +
  "EG MA DZ TN LY SD SS ET ER DJ SO KE UG TZ RW BI CD CG CM GA GQ CF TD NG GH CI SN ML BF NE GM GN GW SL LR TG BJ MR CV ST AO ZM ZW MW MZ BW NA ZA LS SZ MG MU SC KM RE " +
  "AU NZ SG MY TH VN PH ID JP KR HK MO TW CN IN PK BD LK NP BT MV AF MN KH LA MM BN TL PG FJ SB VU WS TO KI TV NR PW FM MH NC PF GU"
).split(" ")
// Shown first, above the A-Z list.
const TOP = ["US", "CA", "GB", "AU", "SG", "AE"]
const NAME_FIX = { HK: "Hong Kong", MO: "Macau", TR: "Turkey", PS: "Palestine", MM: "Myanmar" }
// Extra words people search for.
const ALIASES = { US: "usa america", GB: "uk england britain scotland wales", AE: "uae dubai abu dhabi", SA: "ksa", KR: "korea", CZ: "czech republic", NL: "holland" }
const flagOf = (code) => String.fromCodePoint(...[...code].map((ch) => 127397 + ch.charCodeAt(0)))
const COUNTRIES = (() => {
  let names = null
  try { names = new Intl.DisplayNames(["en"], { type: "region" }) } catch {}
  const list = CODES.map((code) => {
    const name = NAME_FIX[code] || names?.of(code) || code
    return { code, name, flag: flagOf(code), search: `${name} ${code} ${ALIASES[code] || ""}`.toLowerCase() }
  }).sort((x, y) => x.name.localeCompare(y.name))
  const top = TOP.map((code) => list.find((c) => c.code === code))
  return [...top, ...list.filter((c) => !TOP.includes(c.code)), { code: "OTHER", name: "Other", flag: "🌍", search: "other" }]
})()
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
.mlf-combo { position: relative; }
.mlf-combo .mlf-input { padding-right: 48px; cursor: pointer; text-overflow: ellipsis; }
.mlf-combo.is-open .mlf-input { cursor: text; border-color: #D73E33; }
.mlf-chev { position: absolute; top: 17px; right: 20px; pointer-events: none; transition: transform .2s ease; }
.mlf-combo.is-open .mlf-chev { transform: rotate(180deg); }
.mlf-menu { position: absolute; z-index: 20; top: calc(100% + 8px); left: 0; right: 0; max-height: 264px; overflow-y: auto; margin: 0; padding: 6px; list-style: none; background: #FFFFFF; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; box-shadow: 0px 2.29px 10.53px -0.17px rgba(191,187,186,0.2), 0px 10px 46px -0.25px rgba(191,187,186,0.45); scrollbar-width: thin; animation: mlf-drop .15s ease-out; }
.mlf-opt { display: flex; align-items: center; gap: 12px; padding: 10px 14px; font-size: 16px; line-height: 1.5; color: #15181E; border-radius: 8px; cursor: pointer; }
.mlf-opt.is-active { background: rgba(0,0,0,0.03); }
.mlf-opt.is-split { margin-bottom: 13px; overflow: visible; position: relative; }
.mlf-opt.is-split::after { content: ""; position: absolute; left: 14px; right: 14px; bottom: -7px; border-bottom: 1px solid rgba(0,0,0,0.08); }
.mlf-opt[aria-selected="true"] { color: #D73E33; font-weight: 500; background: #FFF0F0; }
.mlf-opt svg { margin-left: auto; flex-shrink: 0; }
.mlf-empty { padding: 10px 14px; font-size: 14px; color: rgba(0,0,0,0.5); }
@keyframes mlf-drop { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: none } }
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
.mlf-overlay { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(21,24,30,0.45); font-family: 'Poppins', 'Poppins Placeholder', sans-serif; animation: mlf-fade .2s ease-out; }
.mlf-modal { position: relative; width: 100%; max-width: 480px; padding: 40px; text-align: center; color: #15181E; background: #FFFFFF; border-radius: 20px; box-shadow: 0px 10px 46px -0.25px rgba(21,24,30,0.25); animation: mlf-pop .25s ease-out; }
.mlf-modal * { box-sizing: border-box; font-family: inherit; }
.mlf-close { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; font-size: 20px; line-height: 1; color: #4D4D4D; background: rgba(0,0,0,0.04); border: none; border-radius: 99px; cursor: pointer; }
.mlf-check { width: 56px; height: 56px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; background: #FFF0F0; border-radius: 99px; }
.mlf-modal h3 { margin: 0 0 8px; font-size: 24px; line-height: 1.3; font-weight: 600; letter-spacing: -0.03em; }
.mlf-modal p { margin: 0; font-size: 16px; line-height: 1.6; color: #4D4D4D; }
.mlf-links { display: flex; flex-direction: column; gap: 10px; margin: 24px 0; }
.mlf-links a { display: block; padding: 12px 16px; font-size: 15px; font-weight: 500; color: #15181E; text-decoration: none; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; }
.mlf-links a:hover { border-color: #D73E33; }
.mlf-modal .mlf-small { font-size: 14px; }
.mlf-modal .mlf-small a { color: #D73E33; font-weight: 500; }
@keyframes mlf-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes mlf-pop { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
@media (max-width: 809px) { .mlf-modal { padding: 32px 24px; } .mlf-modal h3 { font-size: 20px; } }
@media (max-width: 1199px) { .mlf-label { font-size: 12px; } .mlf-button { font-size: 16px; } }
@media (max-width: 809px) { .mlf-menu { max-height: 220px; } .mlf-card { padding: 24px; gap: 20px; } .mlf-row { grid-template-columns: 1fr; } .mlf-chips { grid-template-columns: repeat(2, 1fr); } .mlf-button { font-size: 14px; } .mlf-consent { font-size: 12px; line-height: 1.5; } }
`

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function LeadForm() {
  const [loading, setLoading] = useState(false)
  const [thanks, setThanks] = useState(false)
  const loadedAt = useRef(Date.now())

  useEffect(() => {
    if (!thanks) return
    const onKey = (e) => e.key === "Escape" && setThanks(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [thanks])

  async function onSubmit(e) {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))
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
      if (url.includes(NOT_FIT_PATH)) {
        form.reset()
        loadedAt.current = Date.now()
        setLoading(false)
        setThanks(true)
        return
      }
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
        {/* A div, not a label: a label would reopen the list when an option is clicked. */}
        <div className="mlf-field">
          <label className="mlf-label" htmlFor="mlf-country">Country*</label>
          <CountryPicker />
        </div>
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
      {thanks && createPortal(
        <div className="mlf-overlay" onClick={(e) => e.target === e.currentTarget && setThanks(false)}>
          <div className="mlf-modal" role="dialog" aria-modal="true">
            <button className="mlf-close" aria-label="Close" onClick={() => setThanks(false)}>×</button>
            <div className="mlf-check">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#D73E33" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h3>Thanks for reaching out!</h3>
            <p>We've received your details. Our team reviews every request and will get back to you if Momos is a good fit.</p>
            <div className="mlf-links">
              <a href="/case-studies">See how brands use Momos →</a>
              <a href="/blog">Read the Momos blog →</a>
            </div>
            <p className="mlf-small">
              Run a restaurant or franchise group? Email <a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a> and we'll set up a demo.
            </p>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// A searchable country list styled like the other fields (no browser dropdown).
function CountryPicker() {
  const [value, setValue] = useState("US")
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const listRef = useRef(null)
  const q = query.trim().toLowerCase()
  const matches = q ? COUNTRIES.filter((c) => c.search.includes(q)) : COUNTRIES
  const selected = COUNTRIES.find((c) => c.code === value)

  // Opening highlights the current country. Typing highlights the first match.
  useEffect(() => {
    if (open) setActive(q ? 0 : Math.max(0, COUNTRIES.indexOf(selected)))
  }, [open, q])

  // Keep the highlighted row in view without scrolling the page.
  useEffect(() => {
    const list = listRef.current
    const row = list?.children[active]
    if (!row) return
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop - 6
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight + 6
  }, [active, open])

  function choose(c) {
    setValue(c.code)
    setOpen(false)
    setQuery("")
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      if (!open) return setOpen(true)
      const step = e.key === "ArrowDown" ? 1 : -1
      setActive((i) => Math.min(matches.length - 1, Math.max(0, i + step)))
    } else if (e.key === "Enter" && open) {
      e.preventDefault()
      if (matches[active]) choose(matches[active])
    } else if (e.key === "Escape") {
      setOpen(false)
      setQuery("")
    }
  }

  const label = `${selected.flag}  ${selected.name}`
  return (
    <div className={open ? "mlf-combo is-open" : "mlf-combo"}>
      <input type="hidden" name="country" value={value} />
      <input
        id="mlf-country"
        className="mlf-input"
        role="combobox"
        aria-expanded={open}
        aria-controls="mlf-countries"
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `mlf-c-${matches[active].code}` : undefined}
        autoComplete="off"
        value={open ? query : label}
        placeholder={open ? "Search countries" : label}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => { setOpen(false); setQuery("") }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onKeyDown={onKeyDown}
      />
      <svg className="mlf-chev" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="#15181E" strokeOpacity=".5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {open && (
        <ul className="mlf-menu" id="mlf-countries" role="listbox" ref={listRef}>
          {matches.map((c, i) => (
            <li
              key={c.code}
              id={`mlf-c-${c.code}`}
              role="option"
              aria-selected={c.code === value}
              className={"mlf-opt" + (i === active ? " is-active" : "") + (!q && i === TOP.length - 1 ? " is-split" : "")}
              onMouseDown={(e) => { e.preventDefault(); choose(c) }}
              onMouseEnter={() => setActive(i)}
            >
              <span>{c.flag}</span>
              {c.name}
              {c.code === value && <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="#D73E33" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </li>
          ))}
          {!matches.length && <li className="mlf-empty">No match. Try another spelling, or pick "Other".</li>}
        </ul>
      )}
    </div>
  )
}
