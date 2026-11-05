// Alfie and Rockie banners inside blog posts. banners.json names, for each post, the one or two
// banners it shows; this file holds their designs and decides where in the post each one goes.
// Pure functions, used by add-banners.mjs and the tests.
//
// Each banner is an embed without scripts (so it's in the page's HTML and sits in a shadow root at
// its ⟦embed:bnAlfieReply⟧ line). Images are the characters from momos.com/alfie and /rockie.
// Claims stay within momos.com: Alfie replies in minutes, around the clock, in the brand voice, on
// Google, Yelp, OpenTable and TripAdvisor, and issues loyalty points and offers; Rockie ranks
// locations, finds root causes and sends operator reports to your phone; Papa Murphy's recovered
// over $2M with surveys and offers and automated 97.7% of review replies (its case study).
// Names, reviews, locations and scores inside a banner are labeled or plainly illustrative.

const IMG = id => `https://framerusercontent.com/images/${id}?scale-down-to=512`
const ART = {
    alfieRun: { src: IMG("hugXjhF5wyr5YoGsgZF1uPw2fQ.png"), w: 512, h: 419 },
    alfieWave: { src: IMG("t2exhITLWS76cM33xUI5e0tmZA.png"), w: 487, h: 512 },
    alfiePeace: { src: IMG("IsaQkmA6DMd5M2jdkqS4m9sQ.png"), w: 512, h: 429 },
    alfieWink: { src: IMG("AUIumahhnFtYhMg4gaAqgg1bhY0.png"), w: 418, h: 512 },
    rockieGloves: { src: IMG("kmJ5FhPFfz8bgnrEQZFywuj4Dc.png"), w: 512, h: 430 },
    rockieSmug: { src: IMG("yJ600agNKzLxNZar8q5bPtRhu0.png"), w: 479, h: 512 },
    rockieRun: { src: IMG("k3GSxqwPzKBBZz6pjxHlhdHno.webp"), w: 497, h: 512 },
}
const img = (name, alt, cls = "") => `<img${cls ? ` class="${cls}"` : ""} src="${ART[name].src}" alt="${alt}" width="${ART[name].w}" height="${ART[name].h}" loading="lazy">`

const ALFIE = "https://www.momos.com/alfie"
const ROCKIE = "https://www.momos.com/rockie"
const PAPA = "https://www.momos.com/case-studies/papa-murphys-turns-guest-feedback-into-2m-in-recovered-revenue"

// Shared look: Momos red, ink and grays, Alfie's gold and Rockie's green from their pages.
const BASE = `
&,& *{box-sizing:border-box;margin:0;padding:0}
&{container-type:inline-size;font-family:'Poppins',sans-serif;color:#15181E;max-width:860px;line-height:1.5}
& a{text-decoration:none}
& img{display:block;height:auto;max-width:100%}
& .pill{display:inline-flex;gap:6px;align-items:center;font-size:12px;font-weight:500;padding:4px 10px 4px 4px;border-radius:999px;background:#fff;border:1px solid #E3DCDA;width:max-content;color:#15181E}
& .pill b{font-weight:500;padding:2px 8px;border-radius:999px}
& .pill.al b{background:#F6EEDC;color:#9A7424}
& .pill.ro b{background:#EBEFDD;color:#55652A}
& .btn{display:inline-flex;align-items:center;gap:10px;background:#D73E33;color:#fff;font-weight:600;font-size:15px;padding:10px 10px 10px 18px;border-radius:12px;box-shadow:0 6px 18px -6px rgba(215,62,51,.55);width:max-content;transition:transform .15s}
& .btn i{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#fff;color:#D73E33;font-style:normal;font-size:14px}
& .btn:hover{transform:translateY(-1px)}
& .lnk{font-size:15px;font-weight:600;color:#D73E33;width:max-content}
& .lnk:hover{text-decoration:underline}
& .h{font-size:22px;font-weight:600;line-height:1.25;letter-spacing:-.01em;color:#15181E}
& .xh{font-size:26px;font-weight:700;line-height:1.15;letter-spacing:-.02em;color:#15181E}
& .p{font-size:15px;line-height:1.6;color:#353D4D}
& .ex{font-size:11px;color:#8A8F99;letter-spacing:.04em;text-transform:uppercase}
& .bub{font-size:13px;line-height:1.5;padding:10px 12px;border-radius:14px;max-width:88%;box-shadow:0 2px 8px rgba(21,24,30,.08)}
& .bub.g{background:#fff;justify-self:start;border-bottom-left-radius:4px}
& .bub.a{background:#FBF1DE;justify-self:end;border-bottom-right-radius:4px}
& .bub small{display:block;font-size:11px;font-weight:600;color:#9A7424}
& .card{display:grid;border-radius:20px;overflow:hidden;position:relative}
& .copy{padding:28px;display:grid;gap:12px;align-content:center;min-width:0}
@media (prefers-reduced-motion:reduce){& .btn{transition:none}}
`

// The banners. `who` is the agent it promotes; `big` banners lead, the slim peeks follow.
export const BANNERS = {
    alfieReply: {
        who: "alfie", big: true,
        css: `
& .card{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);background:#FDF7F6;border:1px solid #E3DCDA}
& .stage{position:relative;padding:24px 20px 120px;background:radial-gradient(120% 90% at 80% 100%,#F7E7D9 0%,transparent 60%);display:grid;gap:10px;align-content:start}
& .stage img{position:absolute;right:6px;bottom:-6px;width:170px}
@container (max-width:560px){& .card{grid-template-columns:1fr}& .copy{padding:22px}& .stage{padding-bottom:110px}}`,
        html: () => `<div class="card">
<div class="copy">
<span class="pill al"><b>Alfie</b>Experience Agent</span>
<p class="h">Every guest gets a reply in minutes, at every location</p>
<p class="p">Alfie answers reviews, messages and survey replies in your brand voice, and can add points or an offer from your loyalty program in the same conversation.</p>
<a class="btn" href="${ALFIE}">See Alfie in action <i>→</i></a>
</div>
<div class="stage">
<span class="ex">Example conversation</span>
<p class="bub g">Cold food and the wrong order last night. Expected better.</p>
<p class="bub a"><small>Alfie</small>I'm sorry, Sarah. I've added 500 points to your account. Can I book you a table this week?</p>
${img("alfieRun", "Alfie, the Momos Experience Agent")}
</div>
</div>`,
    },
    alfieInbox: {
        who: "alfie", big: true,
        css: `
& .card{grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);background:#F6EEDC}
& .copy img{width:120px;margin-bottom:-28px}
& .stack{padding:24px 22px 24px 0;display:grid;gap:8px;align-content:center}
& .rv{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;align-items:center;background:#fff;border-radius:12px;padding:10px 12px;font-size:13px;box-shadow:0 2px 8px rgba(21,24,30,.06)}
& .rv:nth-child(2){margin-left:18px}& .rv:nth-child(3){margin-left:36px}
& .st{color:#E0A100;letter-spacing:1px;font-size:12px}
& .src{font-size:11px;color:#8A8F99;letter-spacing:0}
& .qt{color:#353D4D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
& .ok{grid-row:1/3;grid-column:2;font-size:11px;font-weight:600;color:#1E7B4B;background:#DDF3E6;padding:4px 9px;border-radius:999px;white-space:nowrap}
@container (max-width:540px){& .card{grid-template-columns:1fr}& .stack{padding:0 20px 24px}& .copy img{display:none}}`,
        html: () => `<div class="card">
<div class="copy">
<span class="pill al"><b>Alfie</b>Experience Agent</span>
<p class="xh">Every review, answered.</p>
<a class="lnk" href="${ALFIE}">Meet Alfie →</a>
${img("alfieRun", "Alfie, the Momos Experience Agent")}
</div>
<div class="stack" aria-label="Example reviews">
<div class="rv"><span class="st">★★☆☆☆ <span class="src">Google</span></span><span class="ok">✓ Replied</span><span class="qt">"Waited 40 minutes for pickup"</span></div>
<div class="rv"><span class="st">★★★★★ <span class="src">Yelp</span></span><span class="ok">✓ Replied</span><span class="qt">"Best brunch on the block"</span></div>
<div class="rv"><span class="st">★★★☆☆ <span class="src">TripAdvisor</span></span><span class="ok">✓ Replied</span><span class="qt">"Good food, loud room"</span></div>
</div>
</div>`,
    },
    alfieNight: {
        who: "alfie", big: true,
        css: `
& .card{grid-template-columns:minmax(0,1fr) minmax(0,1fr);background:radial-gradient(90% 120% at 85% 0%,#2B3566 0%,#141A33 60%);color:#EDEBFA}
& .card::before{content:"";position:absolute;inset:0;background-image:radial-gradient(1.2px 1.2px at 12% 20%,#fff9 50%,transparent),radial-gradient(1px 1px at 30% 70%,#fff7 50%,transparent),radial-gradient(1.4px 1.4px at 48% 14%,#fffa 50%,transparent),radial-gradient(1px 1px at 70% 40%,#fff6 50%,transparent),radial-gradient(1.2px 1.2px at 90% 78%,#fff8 50%,transparent),radial-gradient(1px 1px at 62% 88%,#fff6 50%,transparent);pointer-events:none}
& .copy{position:relative}
& .clock{font-size:52px;font-weight:700;letter-spacing:-.03em;line-height:1;color:#FFD88A;font-variant-numeric:tabular-nums}
& .clock small{font-size:18px;font-weight:600;margin-left:4px}
& .xh{color:#fff}
& .lnk{color:#FFB4AC}
& .chat{position:relative;padding:26px 22px 110px 0;display:grid;gap:8px;align-content:start}
& .bub{box-shadow:none}
& .bub.g{background:#2C3563;color:#E6E4F6}
& .bub.a{color:#15181E}
& .chat img{position:absolute;right:0;bottom:-8px;width:150px}
@container (max-width:540px){& .card{grid-template-columns:1fr}& .chat{padding:0 20px 110px}}`,
        html: () => `<div class="card">
<div class="copy">
<p class="clock">2:47<small>AM</small></p>
<p class="xh">Alfie works the night shift.</p>
<a class="lnk" href="${ALFIE}">Meet Alfie →</a>
</div>
<div class="chat">
<p class="bub g">Is the patio open tomorrow?</p>
<p class="bub a"><small>Alfie</small>Yes, from 11. Want me to save you a table?</p>
${img("alfieRun", "Alfie, the Momos Experience Agent")}
</div>
</div>`,
    },
    alfieQuiz: {
        who: "alfie", big: true,
        css: `
& .card{background:#fff;border:1px solid #E3DCDA;padding:26px 28px;gap:14px;grid-template-columns:minmax(0,1fr) 120px}
& .qq{font-size:20px;font-weight:600;line-height:1.35;color:#15181E}
& .opts{display:flex;gap:8px;flex-wrap:wrap}
& label{cursor:pointer}
& input{position:absolute;opacity:0;pointer-events:none}
& label span{display:inline-block;padding:8px 16px;border-radius:999px;border:1.5px solid #E3DCDA;font-size:14px;font-weight:500;color:#15181E}
& label:hover span{border-color:#D73E33}
& input:focus-visible+span{outline:2px solid #D73E33;outline-offset:2px}
& input:checked+span{background:#15181E;color:#fff;border-color:#15181E}
& .ans{display:none;align-items:center;gap:12px;flex-wrap:wrap;background:#F6EEDC;border-radius:12px;padding:12px 14px;font-size:15px;color:#15181E}
& .ans b{font-weight:600}
& .card:has(input:checked) .ans{display:flex}
& .card:has(input:checked) .hint{display:none}
& .hint{font-size:12px;color:#8A8F99}
& .card>img{grid-column:2;grid-row:1/5;align-self:end;width:120px;margin-bottom:-26px}
& .lnk{color:#7A5A15}
@container (max-width:540px){& .card{grid-template-columns:1fr}& .card>img{display:none}}`,
        html: () => `<div class="card">
<p class="qq">A 1-star review lands at 9 pm on Friday. When does it get a reply?</p>
<div class="opts">
<label><input type="radio" name="bn-quiz"><span>Saturday</span></label>
<label><input type="radio" name="bn-quiz"><span>Monday</span></label>
<label><input type="radio" name="bn-quiz"><span>Never</span></label>
</div>
<p class="hint">Pick one</p>
<div class="ans"><span>With Alfie: <b>within minutes</b>, in your brand voice.</span><a class="lnk" href="${ALFIE}">Meet Alfie →</a></div>
${img("alfieWink", "Alfie, the Momos Experience Agent")}
</div>`,
    },
    rockieAnswer: {
        who: "rockie", big: true,
        css: `
& .card{grid-template-columns:200px minmax(0,1fr) minmax(0,1fr);background:#fff;border:1px solid #E3DCDA}
& .m{background:linear-gradient(180deg,#EEF2E2,#F8F9F2);display:grid;place-items:end center;padding-top:16px}
& .m img{width:180px}
& .copy{padding:26px 22px}
& .side{padding:22px;display:grid;gap:10px;align-content:center;border-left:1px solid #E3DCDA;background:#FCFCFA}
& .q{font-size:13px;font-weight:500;background:#EBEFDD;color:#2E3618;padding:8px 12px;border-radius:12px}
& .row{display:grid;grid-template-columns:1fr auto;gap:2px 10px;font-size:13px;padding:10px 12px;border:1px solid #E3DCDA;border-radius:12px;background:#fff}
& .row b{font-weight:600}
& .v{font-weight:600;color:#D73E33;font-variant-numeric:tabular-nums}
& .why{grid-column:1/-1;color:#6B717C;font-size:12px}
@container (max-width:640px){& .card{grid-template-columns:120px minmax(0,1fr)}& .m img{width:120px}& .side{grid-column:1/-1;border-left:0;border-top:1px solid #E3DCDA}}
@container (max-width:420px){& .card{grid-template-columns:1fr}& .m{place-items:end start;padding:12px 22px 0}& .m img{width:110px}}`,
        html: () => `<div class="card">
<div class="m">${img("rockieGloves", "Rockie, the Momos Intelligence Agent")}</div>
<div class="copy">
<span class="pill ro"><b>Rockie</b>Intelligence Agent</span>
<p class="h">Know which location needs you this week, and why</p>
<p class="p">Rockie reads your reviews, surveys and POS data, ranks every location and points to the root cause with a next step.</p>
<a class="btn" href="${ROCKIE}">See Rockie in action <i>→</i></a>
</div>
<div class="side">
<span class="ex">Example question</span>
<p class="q">Which locations dropped CSAT last week?</p>
<div class="row"><b>Location 14</b><span class="v">78.6% ↓</span><span class="why">Cold food at dinner, 9 mentions</span></div>
<div class="row"><b>Location 3</b><span class="v">80.2% ↓</span><span class="why">Wait times on weekend lunch</span></div>
</div>
</div>`,
    },
    rockieRanked: {
        who: "rockie", big: true,
        css: `
& .card{grid-template-columns:150px minmax(0,1fr);background:#fff;border:1px solid #E3DCDA}
& .m{background:linear-gradient(180deg,#EEF2E2,#F8F9F2);display:grid;place-items:end center}
& .m img{width:140px}
& .body{padding:24px 26px;display:grid;gap:10px;min-width:0}
& .top{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}
& .xh{font-size:22px}
& .bars{display:grid;gap:6px;font-size:12px}
& .br{display:grid;grid-template-columns:22px 92px minmax(0,1fr) 40px;gap:8px;align-items:center;color:#353D4D}
& .br i{display:block;height:10px;border-radius:5px;background:#B8C58E}
& .n{font-weight:600;color:#15181E;font-variant-numeric:tabular-nums}
& .s{text-align:right;font-variant-numeric:tabular-nums}
& .br.bad i{background:#D73E33}
& .br.bad .s{color:#D73E33;font-weight:600}
& .why{font-size:12px;background:#FDECEA;color:#9B2C24;padding:6px 10px;border-radius:8px;margin-left:30px;width:max-content;max-width:calc(100% - 30px)}
& .lnk{color:#3F4C1C}
@container (max-width:520px){& .card{grid-template-columns:1fr}& .m{display:none}& .br{grid-template-columns:20px 80px minmax(0,1fr) 38px}}`,
        html: () => `<div class="card">
<div class="m">${img("rockieGloves", "Rockie, the Momos Intelligence Agent")}</div>
<div class="body">
<div class="top"><p class="xh">Every location, ranked. The why included.</p><a class="lnk" href="${ROCKIE}">Meet Rockie →</a></div>
<div class="bars" aria-label="Example location ranking">
<div class="br"><span class="n">1</span><span>Downtown</span><i style="width:94%"></i><span class="s">4.8</span></div>
<div class="br"><span class="n">2</span><span>Riverside</span><i style="width:88%"></i><span class="s">4.6</span></div>
<div class="br"><span class="n">3</span><span>Airport</span><i style="width:80%"></i><span class="s">4.4</span></div>
<div class="br bad"><span class="n">14</span><span>Eastgate</span><i style="width:58%"></i><span class="s">3.7</span></div>
</div>
<p class="why">Why: cold food on dinner deliveries</p>
</div>
</div>`,
    },
    rockieReport: {
        who: "rockie", big: true,
        css: `
& .card{grid-template-columns:minmax(0,1fr) 250px;background:#EBEFDD}
& .copy img{width:120px;margin-bottom:-28px}
& .lnk{color:#3F4C1C}
& .phone{margin:22px 26px -60px 0;background:#15181E;border-radius:30px;padding:10px;box-shadow:0 20px 40px -20px rgba(21,24,30,.5)}
& .scr{background:linear-gradient(180deg,#DCE3C6,#F3F5EA);border-radius:22px;padding:14px 10px 70px;display:grid;gap:8px}
& .tm{font-size:28px;font-weight:600;color:#2E3618;text-align:center;letter-spacing:-.02em;margin:4px 0 6px}
& .nt{background:rgba(255,255,255,.9);border-radius:14px;padding:9px 11px;font-size:12px;line-height:1.45;color:#15181E}
& .app{display:flex;justify-content:space-between;font-size:10px;color:#6B717C;margin-bottom:2px;font-weight:500;letter-spacing:.04em;text-transform:uppercase}
& .nt b{font-weight:600}
@container (max-width:560px){& .card{grid-template-columns:1fr}& .phone{margin:0 24px -60px}& .copy img{display:none}}`,
        html: () => `<div class="card">
<div class="copy">
<span class="pill ro"><b>Rockie</b>Intelligence Agent</span>
<p class="xh">Your locations, summed up before your coffee.</p>
<a class="lnk" href="${ROCKIE}">Meet Rockie →</a>
${img("rockieRun", "Rockie, the Momos Intelligence Agent")}
</div>
<div class="phone" aria-label="Example morning report"><div class="scr">
<p class="tm">7:00</p>
<div class="nt"><p class="app"><span>Rockie</span><span>now</span></p><b>2 locations need you today.</b> #14: cold food at dinner. #3: slow weekend lunch.</div>
<div class="nt"><p class="app"><span>Rockie</span><span>Mon</span></p><b>CSAT up at 31 of 40 locations</b> this week.</div>
</div></div>
</div>`,
    },
    duo: {
        who: "both", big: true,
        css: `
& .card{background:#fff;border:1px solid #E3DCDA}
& .top{padding:18px 24px 0;font-size:13px;font-weight:500;color:#353D4D}
& .halves{display:grid;grid-template-columns:1fr 1fr}
& .half{display:grid;grid-template-columns:110px minmax(0,1fr);gap:14px;align-items:end;padding:16px 24px 0}
& .half+.half{border-left:1px dashed #E3DCDA}
& .half img{width:110px}
& .t{display:grid;gap:8px;padding-bottom:22px}
& .t b{font-size:18px;font-weight:600;line-height:1.3;color:#15181E}
& .t span{font-size:14px;color:#353D4D;line-height:1.55}
& .al{background:linear-gradient(0deg,#FBF3E6,transparent 70%)}
& .ro{background:linear-gradient(0deg,#EFF2E4,transparent 70%)}
@container (max-width:600px){& .halves{grid-template-columns:1fr}& .half+.half{border-left:0;border-top:1px dashed #E3DCDA}& .half{grid-template-columns:84px minmax(0,1fr)}& .half img{width:84px}}`,
        html: () => `<div class="card">
<p class="top">Two AI agents for multi-location restaurant brands</p>
<div class="halves">
<div class="half al">${img("alfieWave", "Alfie")}<div class="t"><b>Alfie talks to your guests</b><span>Replies to reviews and messages in your brand voice, around the clock.</span><a class="lnk" href="${ALFIE}">Meet Alfie →</a></div></div>
<div class="half ro">${img("rockieSmug", "Rockie")}<div class="t"><b>Rockie tells you what they're saying</b><span>Spots the issue at each location and what to do about it.</span><a class="lnk" href="${ROCKIE}">Meet Rockie →</a></div></div>
</div>
</div>`,
    },
    proof: {
        who: "alfie", big: true,
        css: `
& .card{grid-template-columns:minmax(0,1fr) minmax(0,1fr);background:#FDF7F6;border:1px solid #E3DCDA;align-items:center}
& .rw{padding:28px 10px 28px 32px;display:grid;place-items:center}
& .rcpt{width:100%;max-width:270px;background:#fff;transform:rotate(-2.5deg);padding:22px 20px 26px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:#2A2D33;box-shadow:0 14px 30px -14px rgba(21,24,30,.35);-webkit-mask:radial-gradient(circle 6px at 50% 0,#0000 98%,#000) 50% 0/14px 51% repeat-x,radial-gradient(circle 6px at 50% 100%,#0000 98%,#000) 50% 100%/14px 51% repeat-x;mask:radial-gradient(circle 6px at 50% 0,#0000 98%,#000) 50% 0/14px 51% repeat-x,radial-gradient(circle 6px at 50% 100%,#0000 98%,#000) 50% 100%/14px 51% repeat-x}
& .c{text-align:center;letter-spacing:.12em;font-weight:500}
& hr{border:0;border-top:1.5px dashed #C9C2BE;margin:12px 0}
& .ln{display:flex;justify-content:space-between;gap:8px}
& .tot{font-family:'Poppins',sans-serif;font-size:44px;font-weight:700;color:#D73E33;letter-spacing:-.03em;line-height:1;text-align:center;margin:6px 0 2px}
& .s{font-size:10px;color:#8A8F99;text-align:center}
& .side{display:grid;gap:14px;justify-items:start;padding:28px 28px 0 10px;align-self:stretch;align-content:end}
& .xh{font-size:24px}
& .side img{width:150px;margin-top:4px}
@container (max-width:540px){& .card{grid-template-columns:1fr}& .rw{padding:28px 24px 8px}& .side{padding:12px 24px 0;grid-template-columns:1fr 110px;align-items:end}& .side img{width:110px;grid-row:1/3;grid-column:2}}`,
        html: () => `<div class="card">
<div class="rw"><div class="rcpt">
<p class="c">PAPA MURPHY'S</p>
<hr>
<p class="ln"><span>Guests won back</span><span>✓</span></p>
<p class="ln"><span>Review replies automated</span><span>97.7%</span></p>
<hr>
<p class="c">RECOVERED</p>
<p class="tot">$2M+</p>
<p class="s">Source: Momos case study</p>
</div></div>
<div class="side">
<p class="xh">Unhappy guests, back at the counter.</p>
<a class="lnk" href="${PAPA}">See how →</a>
${img("alfiePeace", "Alfie, the Momos Experience Agent")}
</div>
</div>`,
    },
    alfiePeek: {
        who: "alfie", big: false,
        css: PEEK("#F6EEDC", "#7A5A15"),
        html: () => peek("alfieWink", "<b>Behind on review replies?</b> Alfie replies on Google, Yelp, OpenTable and TripAdvisor in your brand voice.", ALFIE, "Meet Alfie →"),
    },
    rockiePeek: {
        who: "rockie", big: false,
        css: PEEK("#EBEFDD", "#3F4C1C"),
        html: () => peek("rockieSmug", "<b>Too many dashboards?</b> Ask Rockie which location slipped this week and why.", ROCKIE, "Meet Rockie →"),
    },
}

function PEEK(bg, link) {
    return `
& .strip{display:grid;grid-template-columns:96px minmax(0,1fr) auto;align-items:center;gap:16px;border-radius:16px;padding-right:20px;overflow:hidden;min-height:96px;background:${bg}}
& .pk{align-self:end;height:96px;overflow:hidden;position:relative}
& .pk img{position:absolute;width:118px;max-width:none;left:-14px;top:6px}
& .t{font-size:15px;line-height:1.5;color:#15181E;padding-block:14px}
& .t b{font-weight:600}
& .lnk{white-space:nowrap;color:${link}}
@container (max-width:520px){& .strip{grid-template-columns:80px minmax(0,1fr);row-gap:0}& .lnk{grid-column:2;padding-bottom:14px}& .t{padding-bottom:6px}& .pk{grid-row:1/3}}`
}
function peek(art, text, href, label) {
    return `<div class="strip">
<div class="pk" aria-hidden="true">${img(art, "")}</div>
<p class="t">${text}</p>
<a class="lnk" href="${href}">${label}</a>
</div>`
}

export const KINDS = Object.keys(BANNERS)
// "alfieReply" → "bnAlfieReply", the embed's id in the post.
export const embedId = kind => `bn${kind[0].toUpperCase()}${kind.slice(1)}`
export const markerLine = kind => `<p>⟦embed:${embedId(kind)}⟧</p>`
export const isBannerId = id => KINDS.some(k => embedId(k) === id)

// The embed's code: one element with an id, its CSS scoped to that id.
export function bannerEmbed(kind) {
    const banner = BANNERS[kind]
    if (!banner) throw new Error(`No banner called "${kind}". Banners: ${KINDS.join(", ")}.`)
    const id = `bn-${kind}`
    const css = (BASE + banner.css).trim().replace(/&/g, `#${id}`)
    return `<div id="${id}" data-banner="${kind}">
<style>
${css}
</style>
${banner.html()}
</div>`
}

// --- Where banners go ------------------------------------------------------------------------------

// Code that already promotes Momos: the "See Momos in action" buttons, demo links, product boxes.
const PROMO = /momos-cta-btn|See Momos in action|See how it works|Book a demo|Talk to us|Get started|Try Momos|momos\.com\/(book-a-demo|product\/|alfie|rockie|case-studies)/i
export const isPromoEmbed = code => PROMO.test(String(code ?? ""))
// Headings that close a post: its FAQ, where to start, conclusion, a closing call to action, sources.
const TAIL = /\bFAQs?\b|frequently asked|where to start|which strategies to start|conclusion|final \w+|key takeaways?|takeaways for|wrap(ping)? up|bottom line|in summary|next steps|sources|appendix|references|^ready to\b|^want\b|starts here|what you can do (today|now)|looking ahead|^stop losing/i
// A list of tools ("The 12 Best Restaurant Analytics Software", then "1. Momos", "2. Tenzo"…) and a
// "Best software for…" section.
const TOOLS = /\bbest\b.*\b(software|tools?|platforms?|apps?|solutions?|systems?|ai)\b|\balternatives?\b|\b(software|tools?) (for|to)\b/i
const MOMOS = /\bmomos\b/i
// A link to a Momos product page or a demo in the text.
const PRODUCT_LINK = /href="(https:\/\/www\.momos\.com)?\/(product\/|alfie|rockie|book-a-demo|case-studies)/i

const text = html => String(html).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ").trim()
const words = html => text(html).split(" ").filter(Boolean).length

// The post as sections: the intro (before the first H2), then one per H2.
export function sections(html) {
    const parts = String(html).split(/(?=<h2\b)/i)
    return parts.map((part, i) => {
        const heading = i === 0 && !/^<h2\b/i.test(part) ? null : text(part.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? "")
        return { heading, html: part, words: words(part), embeds: [...part.matchAll(/⟦embed:([A-Za-z0-9_-]+)⟧/g)].map(m => m[1]) }
    })
}

// Picks where each banner goes: before an H2, about a third and two thirds of the way through the
// post's words, between two sections that don't promote Momos, never in the intro or its first
// section, at most once inside a list of tools (between two reviews, two away from the Momos one), never before or after the closing sections (FAQ,
// where to start, conclusion), and preferably not right under another embed. Banners are at least two sections apart.
// Returns [{ kind, index, heading }] for the banners that fit; index is the section the banner
// goes before. `embeds` is the post's Embeds field (id → code).
export function placeBanners(html, kinds, embeds = new Map()) {
    const secs = sections(html)
    const firstH2 = secs.findIndex(s => s.heading != null)
    if (firstH2 < 0) return []
    // Sections that promote Momos: a heading that names it, a promoting embed, a link to a product
    // page, or two mentions in the text (one is usually "my team at Momos").
    const promo = secs.map(s => MOMOS.test(s.heading ?? "") ||
        s.embeds.some(id => !isBannerId(id) && isPromoEmbed(embeds.get(id))) ||
        PRODUCT_LINK.test(s.html) ||
        (text(s.html.replace(/⟦embed:[^⟧]+⟧/g, "")).match(/\bmomos\b/gi) ?? []).length >= 1)
    // Tool lists: the list's heading and the numbered sections after it.
    const tools = secs.map(() => false)
    secs.forEach((s, i) => {
        if (!TOOLS.test(s.heading ?? "")) return
        tools[i] = true
        for (let j = i + 1; j < secs.length && /^\d+[.)]\s/.test(secs[j].heading ?? ""); j++) tools[j] = true
    })
    // A list without a heading: three or more numbered sections named like products ("6. OpenTable").
    const named = s => /^\d+[.)]\s+\S+(\s+\S+){0,3}$/.test(s.heading ?? "")
    for (let i = 0; i < secs.length; i++) {
        let j = i
        while (j < secs.length && named(secs[j])) j++
        if (j - i >= 3) for (let k = i; k < j; k++) tools[k] = true
        i = Math.max(i, j)
    }
    const tail = secs.findIndex((s, i) => i > firstH2 && TAIL.test(s.heading ?? ""))
    const last = (tail < 0 ? secs.length : tail) - 1
    // …and never before the last section ahead of them when it reads as a closing pitch (no list
    // and no subheadings, like "Your Stores Deserve to Be Found").
    const end = /<(ul|ol|li|h3)\b/i.test(secs[last]?.html ?? "") ? last : last - 1
    const endsWithEmbed = s => /⟦embed:[^⟧]+⟧\s*<\/p>\s*$/.test(s.html.trim())
    const candidates = []
    for (let i = firstH2 + 1; i <= end; i++) {
        if (promo[i - 1] || promo[i]) continue
        // Between two tool reviews only if the Momos one is at least two sections away.
        if ((tools[i - 1] || tools[i]) && (promo[i - 2] || promo[i + 1] || TOOLS.test(secs[i - 1].heading ?? "") || TOOLS.test(secs[i].heading ?? ""))) continue
        if (secs[i].embeds.some(isBannerId) || secs[i - 1].embeds.some(isBannerId)) continue
        candidates.push(i)
    }
    const total = secs.reduce((n, s) => n + s.words, 0) || 1
    const before = i => secs.slice(0, i).reduce((n, s) => n + s.words, 0) / total
    // Distance from the target, with a small penalty for sitting right under another embed.
    const cost = (i, target) => Math.abs(before(i) - target) + (endsWithEmbed(secs[i - 1]) ? 0.15 : 0)
    const chosen = []
    const targets = kinds.length === 1 ? [0.4] : [1 / 3, 2 / 3]
    kinds.forEach((kind, k) => {
        const inList = i => tools[i - 1] || tools[i]
        const open = candidates.filter(i => chosen.every(c => Math.abs(c.index - i) >= 2) && (!chosen.length || i > chosen.at(-1).index) &&
            !(inList(i) && chosen.some(c => inList(c.index))))
        if (!open.length) return
        const best = open.reduce((a, b) => cost(b, targets[k]) < cost(a, targets[k]) ? b : a)
        chosen.push({ kind, index: best, heading: secs[best].heading })
    })
    return chosen
}

// The post's HTML with each banner's line before its H2. Lines already there are left as they are.
export function insertBanners(html, placements) {
    const secs = sections(html)
    for (const { kind, index } of placements) {
        if (String(html).includes(`⟦embed:${embedId(kind)}⟧`)) continue
        secs[index].html = markerLine(kind) + (String(html).includes("\n") ? "\n" : "") + secs[index].html
    }
    return secs.map(s => s.html).join("")
}

// Problems with banners.json: unknown banners, too many, two of one kind, two big ones.
export function checkPlan(plan) {
    const problems = []
    for (const [slug, kinds] of Object.entries(plan)) {
        if (slug.startsWith("_")) continue
        if (!Array.isArray(kinds) || kinds.length < 1 || kinds.length > 2) { problems.push(`${slug}: 1 or 2 banners`); continue }
        for (const k of kinds) if (!BANNERS[k]) problems.push(`${slug}: no banner called "${k}"`)
        if (new Set(kinds).size !== kinds.length) problems.push(`${slug}: the same banner twice`)
    }
    return problems
}
