// From github.com/dev-momos-marketing/mkt-automation (blog-migration/framer/HtmlEmbed.tsx).
//
// One embed for blog posts: paste HTML (with its own <style> and <script>) or a URL. It loads only
// when it scrolls near the screen, so a post with several embeds stays light, and only the embeds a
// post actually contains are ever loaded.
//
// Two modes:
// - Sandboxed (default): the HTML runs in its own frame, so its CSS and scripts can't break the page
//   and can't read the visitor's cookies. The frame grows to fit its content.
// - Inline: the HTML becomes part of the page, as in the glossary. For trusted code that has to
//   reach the page (scroll links, the page's own styles). Its text is in the page's HTML for Google.
import { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Start loading this far before the embed scrolls into view.
const PRELOAD_MARGIN = "600px"
const MESSAGE = "momos-html-embed:height"

type Props = {
    mode: "sandboxed" | "inline"
    html: string
    url: string
    title: string
    minHeight: number
    lazy: boolean
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function HtmlEmbed({ mode = "sandboxed", html = "", url = "", title = "Embedded content", minHeight = 200, lazy = true, style }: Props) {
    const ref = useRef<HTMLDivElement>(null)
    const onCanvas = RenderTarget.current() === RenderTarget.canvas
    const visible = useNearScreen(ref, lazy && !onCanvas)
    const empty = !html.trim() && !url.trim()

    if (empty) {
        return (
            <div ref={ref} style={{ ...box, minHeight, ...style }}>
                {onCanvas && <span style={hint}>HTML Embed: paste HTML or a URL in the properties panel</span>}
            </div>
        )
    }

    return (
        <div ref={ref} style={{ width: "100%", minHeight: visible ? undefined : minHeight, ...style }}>
            {mode === "inline" && html.trim() ? (
                <InlineHtml html={html} runScripts={visible && !onCanvas} />
            ) : visible ? (
                <Frame html={html} url={url} title={title} minHeight={minHeight} />
            ) : null}
        </div>
    )
}

// The HTML in a sandboxed frame that resizes itself to its content. A URL embed can't report its
// height across sites, so it keeps the minimum height.
function Frame({ html, url, title, minHeight }: { html: string; url: string; title: string; minHeight: number }) {
    const frame = useRef<HTMLIFrameElement>(null)
    const [height, setHeight] = useState(minHeight)
    const useUrl = !html.trim()

    useEffect(() => {
        if (useUrl) return
        const onMessage = (event: MessageEvent) => {
            if (event.source !== frame.current?.contentWindow || event.data?.type !== MESSAGE) return
            const h = Number(event.data.height)
            if (Number.isFinite(h) && h > 0) setHeight(Math.ceil(h))
        }
        window.addEventListener("message", onMessage)
        return () => window.removeEventListener("message", onMessage)
    }, [useUrl])

    return (
        <iframe
            ref={frame}
            title={title}
            src={useUrl ? url.trim() : undefined}
            srcDoc={useUrl ? undefined : documentFor(html)}
            // No allow-same-origin: the embed can't read the page, its cookies or its storage.
            sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
            allow="clipboard-write; fullscreen"
            loading="lazy"
            style={{ display: "block", width: "100%", height: useUrl ? minHeight : height, border: 0, background: "transparent" }}
        />
    )
}

// Wraps the pasted HTML in a page that matches the site's type, resolves links like /blog/... to
// momos.com and opens them in the main window, and reports its height whenever it changes.
function documentFor(html: string) {
    const origin = typeof window === "undefined" ? "https://www.momos.com" : window.location.origin
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base href="${origin}/" target="_top">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap">
<style>html,body{margin:0;padding:0;background:transparent}body{display:flow-root;font-family:Poppins,system-ui,sans-serif;overflow:hidden}</style>
</head><body>${html}
<script>(function(){var last=0;function send(){var h=Math.ceil(document.body.getBoundingClientRect().height);if(h!==last){last=h;parent.postMessage({type:${JSON.stringify(MESSAGE)},height:h},"*")}}
new ResizeObserver(send).observe(document.body);window.addEventListener("load",send);send()})()</script>
</body></html>`
}

// The HTML as part of the page. HTML inserted this way doesn't run its <script> tags, so each is
// swapped for a fresh copy that the browser does run, once the embed is near the screen.
function InlineHtml({ html, runScripts }: { html: string; runScripts: boolean }) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!runScripts || !ref.current) return
        for (const old of ref.current.querySelectorAll("script")) {
            if (old.type && !["text/javascript", "module"].includes(old.type)) continue
            const script = document.createElement("script")
            for (const { name, value } of old.attributes) script.setAttribute(name, value)
            script.textContent = old.textContent
            old.replaceWith(script)
        }
    }, [html, runScripts])

    return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
}

// True once the element is within PRELOAD_MARGIN of the screen, and from then on.
function useNearScreen(ref: React.RefObject<HTMLElement>, lazy: boolean) {
    const [near, setNear] = useState(!lazy)

    useEffect(() => {
        if (near || !ref.current) return
        if (typeof IntersectionObserver === "undefined") return setNear(true)
        const observer = new IntersectionObserver(
            entries => {
                if (entries.some(e => e.isIntersecting)) {
                    setNear(true)
                    observer.disconnect()
                }
            },
            { rootMargin: PRELOAD_MARGIN }
        )
        observer.observe(ref.current)
        return () => observer.disconnect()
    }, [near, ref])

    return near
}

const box: React.CSSProperties = { width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }
const hint: React.CSSProperties = { font: "12px/1.4 system-ui, sans-serif", color: "#888", padding: 12, textAlign: "center", border: "1px dashed #ccc", borderRadius: 8 }

addPropertyControls(HtmlEmbed, {
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["sandboxed", "inline"],
        optionTitles: ["Sandboxed", "Inline"],
        defaultValue: "sandboxed",
        displaySegmentedControl: true,
        description: "Sandboxed is safer. Inline puts trusted HTML in the page itself.",
    },
    html: { type: ControlType.String, title: "HTML", displayTextArea: true, defaultValue: "" },
    url: {
        type: ControlType.String,
        title: "URL",
        defaultValue: "",
        placeholder: "https://…",
        hidden: (props: Partial<Props>) => props.mode === "inline" || Boolean(props.html?.trim()),
    },
    title: {
        type: ControlType.String,
        title: "Title",
        defaultValue: "Embedded content",
        description: "Read out by screen readers.",
        hidden: (props: Partial<Props>) => props.mode === "inline",
    },
    minHeight: { type: ControlType.Number, title: "Min height", defaultValue: 200, min: 0, max: 2000, step: 10, unit: "px" },
    lazy: { type: ControlType.Boolean, title: "Load", enabledTitle: "On scroll", disabledTitle: "At once", defaultValue: true },
})
