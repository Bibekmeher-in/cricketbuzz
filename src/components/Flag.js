// Simple helper to map team names to 2-letter ISO codes (best-effort).
// Add / extend mappings as needed.
const TEAM_TO_ISO = {
    india: 'in',
    ind: 'in',
    australia: 'au',
    aus: 'au',
    england: 'gb',
    eng: 'gb',
    'new zealand': 'nz',
    nz: 'nz',
    pakistan: 'pk',
    pak: 'pk',
    'south africa': 'za',
    sa: 'za',
    'sri lanka': 'lk',
    sl: 'lk',
    bangladesh: 'bd',
    bd: 'bd',
    afghanistan: 'af',
    afg: 'af',
    ireland: 'ie',

    zimbabwe: 'zw',
    netherlands: 'nl',
    'west indies': 'ag', // best-effort: use Antigua/Barbuda glyph (West Indies not a single country); change if you prefer a custom icon
    'west indies': 'ag',
    wi: 'ag',
    usa: 'us',
    'united states': 'us',
    scotland: 'gb', // use GB as fallback
    'uae': 'ae',
    'united arab emirates': 'ae',
    canada: 'ca',
};

// returns a FlagCDN url for given ISO code. size can be 'w20', 'w40', 'w80' etc.
// Example: https://flagcdn.com/w40/in.png
export function getFlagCdnUrlForIso(iso, size = 'w40') {
    if (!iso) return null;
    return `https://flagcdn.com/${size}/${String(iso).toLowerCase()}.png`;
}

// try to infer iso from team name (string). Returns iso or null
export function inferIsoFromTeamName(name = '') {
    if (!name) return null;
    const n = String(name).trim().toLowerCase();
    // direct exact key
    if (TEAM_TO_ISO[n]) return TEAM_TO_ISO[n];
    // try partial matching
    for (const key of Object.keys(TEAM_TO_ISO)) {
        if (n.includes(key)) return TEAM_TO_ISO[key];
    }
    // try extracting 3-letter codes inside name like "IND" or "(IND)"
    const match = n.match(/\b([A-Z]{2,3})\b/i);
    if (match) {
        const code = match[1].toLowerCase();
        // map common 3-letter to iso if present
        if (TEAM_TO_ISO[code]) return TEAM_TO_ISO[code];
    }
    return null;
}

// Convert ISO (e.g. 'in') to emoji flag (regional indicators)
export function isoToEmoji(iso) {
    if (!iso || iso.length !== 2) return null;
    const A = 0x1f1e6 - 65;
    const codePoints = [...iso.toUpperCase()].map((c) => A + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

// For UI: returns object { src, emoji, label }
// src is FlagCDN url if available, emoji fallback present otherwise
export function flagForTeamName(teamName) {
    const iso = inferIsoFromTeamName(teamName);
    if (iso) {
        return { src: getFlagCdnUrlForIso(iso, 'w40'), emoji: isoToEmoji(iso), label: teamName };
    }
    // else produce initials fallback
    const initials = (teamName || '')
        .split(' ')
        .map((s) => s[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    return { src: null, emoji: null, label: teamName, initials };
}