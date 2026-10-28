// Synced from github.com/dev-momos-marketing/mkt-automation (blog-migration/framer/BlogEmbeds.tsx) by
// npm run setup. Edit it there: changes made in Framer are overwritten by the next setup run.
//
// Puts a blog post's embeds where its text says so. The post's Content field has a line like
// ⟦embed:Eo0D3eGLd⟧ where each embed goes, and its Embeds field holds the code for each one:
//   <template data-embed="Eo0D3eGLd"> …HTML… </template>
// On the blog template, place this component after the text connected to Content, and connect its
// "Embeds" property to the Embeds field. It shows nothing itself.
//
// - Embeds without scripts are in the page's HTML from the server, hidden, so Google reads them as
//   it does today; in the browser each one moves to its marker line, which is then hidden, inside a
//   shadow root so the post's text styles don't reach it. Wide ones scroll sideways on small screens.
// - Embeds with scripts run in a sandboxed frame at their marker that grows to fit, as Framer's
//   Embed did, loading as they scroll near.
// - A marker without matching code is hidden, so visitors never see it.
// - It also sets the size of the post's H2 and H3 headings (the "Headings" properties): the text
//   styles the template's text uses are shared with the rest of the site and are too big for an
//   article. The CSS is in the server's HTML, so the headings never jump. It also keeps the text
//   (and the frame around it) within the screen's width on tablets and phones.
import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

const MARKER = /^\s*⟦embed:([A-Za-z0-9_-]+)⟧\s*$/
const BLOCK = /<template data-embed="([A-Za-z0-9_-]+)">\n?([\s\S]*?)\n?<\/template>/g
const MESSAGE = "momos-blog-embed:height"

type Props = { embeds: string; spacing: number; h2: number; h3: number }

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function BlogEmbeds({ embeds = "", spacing = 24, h2 = 28, h3 = 22 }: Props) {
    const ref = useRef<HTMLDivElement>(null)
    const entries = parse(embeds)
    const onCanvas = RenderTarget.current() === RenderTarget.canvas

    useEffect(() => {
        if (onCanvas || !ref.current) return
        const sources = ref.current
        const placed = new Map<string, HTMLElement>()

        const place = () => {
            for (const p of Array.from(document.querySelectorAll<HTMLElement>("p"))) {
                const id = p.textContent?.match(MARKER)?.[1]
                if (!id || p.dataset.embedPlaced) continue
                p.dataset.embedPlaced = "true"
                p.style.display = "none"
                const html = entries.get(id)
                if (html == null) {
                    console.warn(`BlogEmbeds: no code for ⟦embed:${id}⟧ in the Embeds field.`)
                    continue
                }
                const box = placed.get(id) ?? document.createElement("div")
                if (!placed.has(id)) {
                    box.dataset.embed = id
                    box.style.cssText = `width:100%;margin:${spacing}px 0`
                    if (hasScript(html)) box.appendChild(frame(id, html))
                    else {
                        // The box sits inside the post's text, so the text's styles (paragraph
                        // spacing, heading sizes) would reach the embed's own tags. A shadow root
                        // keeps them apart, as the embed's own frame did on the old layout. The
                        // server-rendered copy is moved in, so the HTML isn't parsed twice.
                        const root = box.shadowRoot ?? box.attachShadow({ mode: "open" })
                        root.innerHTML = `<style>:host{all:initial;display:block;width:100%;max-width:100%;overflow-x:auto;font-family:inherit}</style>`
                        const source = sources.querySelector<HTMLElement>(`[data-embed-source="${id}"]`)
                        if (source?.firstChild) while (source.firstChild) root.appendChild(source.firstChild)
                        else {
                            const parsed = document.createElement("template")
                            parsed.innerHTML = html
                            root.appendChild(parsed.content)
                        }
                    }
                    placed.set(id, box)
                }
                p.after(box)
            }
        }

        const onMessage = (event: MessageEvent) => {
            if (event.data?.type !== MESSAGE) return
            for (const iframe of Array.from(document.querySelectorAll<HTMLIFrameElement>("iframe[data-embed-frame]"))) {
                if (iframe.contentWindow === event.source && Number(event.data.height) > 0) iframe.style.height = `${Math.ceil(event.data.height)}px`
            }
        }

        place()
        // Framer can render the text again (a language switch, a late load): place any new markers.
        let pending = 0
        const observer = new MutationObserver(() => {
            cancelAnimationFrame(pending)
            pending = requestAnimationFrame(place)
        })
        observer.observe(document.body, { childList: true, subtree: true })
        window.addEventListener("message", onMessage)
        return () => {
            observer.disconnect()
            cancelAnimationFrame(pending)
            window.removeEventListener("message", onMessage)
            for (const box of placed.values()) box.remove()
            for (const p of Array.from(document.querySelectorAll<HTMLElement>("p[data-embed-placed]"))) {
                delete p.dataset.embedPlaced
                p.style.display = ""
            }
        }
    }, [embeds, spacing, onCanvas])

    if (onCanvas) {
        return (
            <div style={hint}>
                Blog embeds: {entries.size} for this post. On the site, each appears at its ⟦embed:…⟧ line in the text.
            </div>
        )
    }

    // Embeds without scripts, in the server's HTML for search engines, hidden until placed.
    return (
        <div ref={ref} hidden aria-hidden="true" data-blog-embeds="">
            <style dangerouslySetInnerHTML={{ __html: headingCss(h2, h3) }} />
            {Array.from(entries)
                .filter(([, html]) => !hasScript(html))
                .map(([id, html]) => (
                    <div key={id} data-embed-source={id} dangerouslySetInnerHTML={{ __html: html }} />
                ))}
        </div>
    )
}

// Heading sizes for the post's text: the rich text placed before this component. Smaller on tablets
// and phones, at the site's breakpoints (Tablet below 1200px, Phone below 810px).
function headingCss(h2: number, h3: number) {
    const rich = `[data-framer-component-type="RichTextContainer"]`
    const text = `${rich}:has(~ * [data-blog-embeds])`
    // The text's frame and the one around it have a fixed width that's wider than a phone.
    const fit = `*:has(> ${rich} ~ * [data-blog-embeds]),*:has(> * > ${rich} ~ * [data-blog-embeds]){max-width:100%!important}`
    const sizes = (a: number, b: number) =>
        `${text} h2{--framer-font-size:${a}px!important;--framer-line-height:1.35!important}` +
        `${text} h3{--framer-font-size:${b}px!important;--framer-line-height:1.4!important}`
    return (
        fit +
        sizes(h2, h3) +
        `@media (max-width:1199px){${sizes(Math.round(h2 * 0.86), Math.round(h3 * 0.9))}}` +
        `@media (max-width:809px){${sizes(Math.round(h2 * 0.79), Math.round(h3 * 0.82))}}`
    )
}

function parse(text: string) {
    const out = new Map<string, string>()
    for (const m of String(text ?? "").matchAll(BLOCK)) out.set(m[1], m[2])
    return out
}

function hasScript(html: string) {
    return /<script\b/i.test(html)
}

// An embed with scripts in its own sandboxed frame: it can't read the page or its cookies. It
// reports its height so the frame fits it, and loads when it scrolls near.
function frame(id: string, html: string) {
    const iframe = document.createElement("iframe")
    iframe.dataset.embedFrame = id
    iframe.title = "Embedded content"
    iframe.loading = "lazy"
    iframe.setAttribute("sandbox", "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation")
    iframe.style.cssText = "display:block;width:100%;height:200px;border:0;background:transparent"
    iframe.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base href="${window.location.origin}/" target="_top">
<style>html,body{margin:0;padding:0;background:transparent}body{display:flow-root;overflow:hidden}</style>
</head><body>${html}
<script>(function(){var last=0;function send(){var h=Math.ceil(document.body.getBoundingClientRect().height);if(h!==last){last=h;parent.postMessage({type:${JSON.stringify(MESSAGE)},height:h},"*")}}
new ResizeObserver(send).observe(document.body);window.addEventListener("load",send);send()})()</script>
</body></html>`
    return iframe
}

const hint: React.CSSProperties = {
    font: "12px/1.4 system-ui, sans-serif",
    color: "#888",
    padding: 12,
    border: "1px dashed #ccc",
    borderRadius: 8,
    textAlign: "center",
}

addPropertyControls(BlogEmbeds, {
    embeds: {
        type: ControlType.String,
        title: "Embeds",
        displayTextArea: true,
        defaultValue: "",
        description: "Connect to the post's Embeds field.",
    },
    spacing: { type: ControlType.Number, title: "Spacing", defaultValue: 24, min: 0, max: 120, step: 4, unit: "px" },
    h2: { type: ControlType.Number, title: "H2 size", defaultValue: 28, min: 16, max: 64, step: 1, unit: "px", description: "Desktop size of the post's H2 headings; smaller on tablets and phones." },
    h3: { type: ControlType.Number, title: "H3 size", defaultValue: 22, min: 14, max: 48, step: 1, unit: "px" },
})
