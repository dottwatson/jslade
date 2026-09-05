import fs from 'node:fs'
import path from 'node:path'

/** Line hit rate from merged lcov DA records. */
export function lineCoveragePercent(lcovPath) {
    const text = fs.readFileSync(lcovPath, 'utf8')
    let hit = 0
    let total = 0
    for (const line of text.split('\n')) {
        if (!line.startsWith('DA:')) continue
        total++
        const executions = Number(line.slice(3).split(',')[1])
        if (executions > 0) hit++
    }
    if (!total) return 0
    return Math.round((hit / total) * 1000) / 10
}

export function badgeColor(percent) {
    if (percent >= 90) return 'brightgreen'
    if (percent >= 80) return 'green'
    if (percent >= 70) return 'yellowgreen'
    if (percent >= 60) return 'yellow'
    if (percent >= 50) return 'orange'
    return 'red'
}

export function writeCoverageBadge(packageRoot, percent) {
    const badgeDir = path.join(packageRoot, 'badges')
    fs.mkdirSync(badgeDir, { recursive: true })
    const payload = {
        schemaVersion: 1,
        label: 'coverage',
        message: `${percent}%`,
        color: badgeColor(percent),
    }
    fs.writeFileSync(path.join(badgeDir, 'coverage.json'), JSON.stringify(payload, null, 4) + '\n')
    return payload
}

export function printCoverageSummary(lcovPath, label = 'merged') {
    const text = fs.readFileSync(lcovPath, 'utf8')
    const files = new Map()
    let current = null

    for (const line of text.split('\n')) {
        if (line.startsWith('SF:')) {
            current = line.slice(3).replace(/\\/g, '/')
            files.set(current, { hit: 0, total: 0 })
            continue
        }
        if (!current || !line.startsWith('DA:')) continue
        const file = files.get(current)
        file.total++
        if (Number(line.slice(3).split(',')[1]) > 0) file.hit++
        if (line === 'end_of_record') current = null
    }

    let hit = 0
    let total = 0
    for (const file of files.values()) {
        hit += file.hit
        total += file.total
    }

    const pct = total ? Math.round((hit / total) * 1000) / 10 : 0
    console.log(`\n[coverage] ${label}: ${pct}% lines (${hit}/${total}) across ${files.size} files\n`)
    return pct
}
