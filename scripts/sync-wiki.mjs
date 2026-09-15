/**
 * Sync package/docs book → GitHub Wiki repo.
 * Source of truth: docs/ + docs/_book.json
 *
 * Usage: node scripts/sync-wiki.mjs <path-to-wiki-clone>
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const docsDir = path.join(packageRoot, 'docs')
const bookPath = path.join(docsDir, '_book.json')

const wikiDir = process.argv[2]

if (!wikiDir) {
    console.error('Usage: node scripts/sync-wiki.mjs <path-to-wiki-clone>')
    process.exit(1)
}

const wikiRoot = path.resolve(wikiDir)
if (!fs.existsSync(wikiRoot)) {
    fs.mkdirSync(wikiRoot, { recursive: true })
}

/** @param {string} filename */
function toWikiSlug(filename) {
    const base = path.basename(filename, '.md')
    return base
        .split('-')
        .map((part) => {
            if (/^[A-Z]$/.test(part)) return part
            if (/^\d+$/.test(part)) return part
            return part.charAt(0).toUpperCase() + part.slice(1)
        })
        .join('-')
}

/** @param {import('node:fs').PathLike} filePath */
function normalizeDocPath(filePath) {
    return String(filePath).replace(/\\/g, '/')
}

/** @param {object} book */
function collectChapters(book) {
    /** @type {Array<{file:string, title:string, wiki:string, sectionTitle:string, sectionId:string}>} */
    const chapters = []
    for (const section of book.sections) {
        for (const ch of section.chapters) {
            chapters.push({
                file: normalizeDocPath(ch.file),
                title: ch.title,
                wiki: ch.wiki || toWikiSlug(ch.file),
                sectionTitle: section.title,
                sectionId: section.id,
            })
        }
    }
    return chapters
}

/** @param {Map<string, string>} linkMap @param {string} body @param {string} fromFile */
function rewriteLinks(body, linkMap, fromFile) {
    return body.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (full, text, target) => {
        if (!target.includes('.md')) return full
        const hashIdx = target.indexOf('#')
        const filePart = hashIdx >= 0 ? target.slice(0, hashIdx) : target
        const anchor = hashIdx >= 0 ? target.slice(hashIdx) : ''
        if (filePart.startsWith('http://') || filePart.startsWith('https://')) return full

        const resolved = resolveDocLink(filePart, fromFile)
        const wiki = linkMap.get(resolved)
        if (!wiki) return full
        const wikiTarget = anchor ? `${wiki}${anchor}` : wiki
        return `[[${wikiTarget}|${text || wiki}]]`
    })
}

/** @param {string} raw @param {string} fromFile */
function resolveDocLink(raw, fromFile) {
    const fromDir = path.join(docsDir, path.dirname(fromFile))
    const abs = path.normalize(path.join(fromDir, raw))
    return normalizeDocPath(path.relative(docsDir, abs))
}

/** @param {string} wikiSlug @param {string} anchor */
function wikiLink(wikiSlug, anchor) {
    if (anchor) {
        const slug = anchor
            .slice(1)
            .toLowerCase()
            .replace(/[^\w]+/g, '-')
            .replace(/^-|-$/g, '')
        return `[[${wikiSlug}#${slug}|${wikiSlug}]]`
    }
    return `[[${wikiSlug}]]`
}

const book = JSON.parse(fs.readFileSync(bookPath, 'utf8'))
const chapters = collectChapters(book)

/** @type {Map<string, string>} */
const fileToWiki = new Map()
for (const ch of chapters) {
    fileToWiki.set(ch.file, ch.wiki)
}

/** @type {Map<string, typeof chapters[0]>} */
const wikiToChapter = new Map()
for (const ch of chapters) {
    wikiToChapter.set(ch.wiki, ch)
}

for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i]
    const prev = i > 0 ? chapters[i - 1] : null
    const next = i < chapters.length - 1 ? chapters[i + 1] : null
    const srcPath = path.join(docsDir, ch.file)
    if (!fs.existsSync(srcPath)) {
        console.error(`Missing doc: ${srcPath}`)
        process.exit(1)
    }
    let body = fs.readFileSync(srcPath, 'utf8')
    body = rewriteLinks(body, fileToWiki, ch.file)
    const nav = []
    if (prev) nav.push(`← [[${prev.wiki}|${prev.title}]]`)
    if (next) nav.push(`[[${next.wiki}|${next.title}]] →`)
    if (nav.length) body += `\n\n---\n\n${nav.join(' · ')}\n`
    fs.writeFileSync(path.join(wikiRoot, `${ch.wiki}.md`), body)
    console.log(`${ch.file} → ${ch.wiki}.md`)
}

const ordered = chapters.map((ch) => ch.wiki)

const homeLines = [
    `# ${book.title}`,
    '',
    'Client-side component engine with Blade-like templates, reactive `state`, and scoped CSS.',
    '',
    `These wiki pages are **synced automatically** from [\`docs/\`](https://github.com/dottwatson/jslade/tree/main/package/docs) in the main repository — edit there, not in the wiki UI.`,
    '',
    '## Reading paths',
    '',
]

for (const rp of book.readingPaths) {
    homeLines.push(`### ${rp.title}`)
    const list =
        rp.chapters === 'all'
            ? ordered.map((w) => wikiLink(w))
            : rp.chapters.map((id) => {
                  const ch = chapters.find((c) => path.basename(c.file, '.md') === id)
                  return ch ? wikiLink(ch.wiki) : id
              })
    homeLines.push(list.join(' → '))
    homeLines.push('')
}

homeLines.push('## Contents', '')

for (const section of book.sections) {
    homeLines.push(`### ${section.title}`)
    for (const ch of section.chapters) {
        const wiki = ch.wiki || toWikiSlug(ch.file)
        homeLines.push(`- ${wikiLink(wiki)} — ${ch.title}`)
    }
    homeLines.push('')
}

homeLines.push(
    '## Links',
    '',
    '- [Repository](https://github.com/dottwatson/jslade)',
    '- [npm package](https://www.npmjs.com/package/jslade)',
    ''
)

fs.writeFileSync(path.join(wikiRoot, 'Home.md'), homeLines.join('\n'))
console.log('Home.md written')

const sidebarLines = ['### [[Home]]', '']

for (const section of book.sections) {
    sidebarLines.push(`**${section.title}**`)
    for (const ch of section.chapters) {
        const wiki = ch.wiki || toWikiSlug(ch.file)
        sidebarLines.push(`- [[${wiki}|${ch.title}]]`)
    }
    sidebarLines.push('')
}

fs.writeFileSync(path.join(wikiRoot, '_Sidebar.md'), sidebarLines.join('\n'))
console.log('_Sidebar.md written')
