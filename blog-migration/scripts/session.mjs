// A connection to the Framer project that survives Framer's session closing, which it does on long
// runs, after big reads and on messages that are too big. Used by the scripts that write posts.
import { COLLECTION, batchesBySize, openProject } from "./lib.mjs"

const BATCH = 20
// Framer closes the connection on a message that's too big (a post with its Content and Embeds in
// every language is often 100–250 KB), so saves stay under this size.
const MAX_BATCH_BYTES = Number(process.env.BLOG_MAX_BATCH_BYTES) || 400_000

export async function openBlogSession() {
    // The session can also close outside any call. That's noted instead of ending the run; the
    // next call then fails and is retried over a fresh connection.
    process.on("unhandledRejection", error => {
        if (!error?.retryable) throw error
        console.log(`Framer's session closed (${error.code ?? error.message}); the next step reconnects.`)
    })
    let framer = await openProject()
    const names = new Map()

    async function reconnect(attempt) {
        await new Promise(resolve => setTimeout(resolve, Math.min(attempt, 3) * 5000))
        await framer.disconnect().catch(() => {})
        framer = await openProject()
    }

    async function collection() {
        const found = (await framer.getCollections()).find(c => c.name === COLLECTION)
        if (!found) throw new Error(`No "${COLLECTION}" collection in Framer. Set BLOG_COLLECTION to its name.`)
        return found
    }

    // Runs a read, reconnecting and trying again (up to 3 more times) if Framer's session closes.
    async function retrying(what, read) {
        for (let attempt = 1; ; attempt++) {
            try {
                return await read()
            } catch (error) {
                if (!error?.retryable || attempt === 4) throw error
                console.log(`Framer's session closed while ${what} (${error.code ?? error.message}); reconnecting (attempt ${attempt + 1} of 4)...`)
                await reconnect(attempt)
            }
        }
    }

    // Reads the Blog collection's fields, posts and the project's languages.
    async function read() {
        return retrying("reading the posts", async () => {
            const blog = await collection()
            const items = await blog.getItems()
            for (const item of items) names.set(item.id, item.slug)
            return { fields: await blog.getFields(), items, locales: (await framer.getLocales()).map(l => ({ id: l.id, code: l.code })) }
        })
    }

    // Saves posts in batches small enough for Framer. If Framer still closes the connection, it
    // reconnects and tries again with the batch split in half, down to one post; a single post that
    // keeps failing stops the run with its name. Saving a post again is harmless.
    async function save(updates) {
        let saved = 0
        const pending = batchesBySize(updates, MAX_BATCH_BYTES, BATCH)
        let failures = 0
        while (pending.length) {
            const batch = pending.shift()
            try {
                await (await collection()).addItems(batch)
                saved += batch.length
                failures = 0
                console.log(`Saved ${saved} of ${updates.length} posts.`)
            } catch (error) {
                if (!error?.retryable) throw error
                failures++
                if (batch.length === 1 && failures >= 3) {
                    throw new Error(`Framer keeps closing the connection while saving ${names.get(batch[0].id) ?? batch[0].id} (${error.code ?? error.message}). ${saved} posts were saved; run again to continue.`)
                }
                const halves = batch.length > 1 ? [batch.slice(0, Math.ceil(batch.length / 2)), batch.slice(Math.ceil(batch.length / 2))] : [batch]
                console.log(`Framer closed the connection (${error.code ?? error.message}) while saving ${batch.length} post${batch.length > 1 ? "s" : ""}; reconnecting and trying again${batch.length > 1 ? " in smaller batches" : ""}...`)
                pending.unshift(...halves)
                await reconnect(failures)
            }
        }
    }

    // The posts as saved now, by id.
    async function readBack() {
        return new Map((await retrying("checking the posts", async () => (await collection()).getItems())).map(i => [i.id, i]))
    }

    return { read, save, readBack, disconnect: () => framer.disconnect().catch(() => {}) }
}
