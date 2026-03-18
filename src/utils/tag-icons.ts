/**
 * Small inline SVG icons for equipment and representation tags.
 * Each icon is 14×14, stroke-based, using currentColor so it
 * inherits the tag's text colour.
 */

const s = 'xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"';

const ICONS: Record<string, string> = {
  // ── Equipment ──────────────────────────────────────────────
  // Hearing Aid: ear outline with BTE device
  'Hearing Aid': `<svg ${s}><path d="M4.5 3.5C5.5 2 7.5 1.5 9 3c1 1 1 2.5.5 4-.5 1.2-1.5 2-2 3-.5.8-.5 1.5-.5 2"/><path d="M10 2.5c.5-.3 1.2-.2 1.5.2s.5 1.5 0 2.5l-.5 1"/><circle cx="7" cy="12" r=".7" fill="currentColor" stroke="none"/></svg>`,

  // Cochlear Implant: ear with circular processor + magnet
  'Cochlear Implant': `<svg ${s}><path d="M4.5 3.5C5.5 2 7.5 1.5 9 3c1 1 1 2.5.5 4-.5 1.2-1.5 2-2 3"/><circle cx="11" cy="3" r="1.8"/><line x1="11" y1="4.8" x2="10" y2="6.5"/></svg>`,

  // BAHA: bone-anchored device on skull
  'BAHA': `<svg ${s}><circle cx="7" cy="5" r="2.5"/><line x1="7" y1="7.5" x2="7" y2="10"/><circle cx="7" cy="11" r="1" fill="currentColor" stroke="none"/></svg>`,

  // FM System: radio/antenna with waves
  'FM System': `<svg ${s}><rect x="4" y="5" width="6" height="5" rx="1"/><line x1="7" y1="5" x2="7" y2="2"/><path d="M5 3.5c.5-1 1-1.5 2-1.5s1.5.5 2 1.5"/><path d="M3.5 4c.8-2 1.8-3 3.5-3s2.7 1 3.5 3"/></svg>`,

  // Assistive Technology: accessibility/gear icon
  'Assistive Technology': `<svg ${s}><circle cx="7" cy="7" r="2"/><path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.8 2.8l1.4 1.4M9.8 9.8l1.4 1.4M11.2 2.8l-1.4 1.4M4.2 9.8l-1.4 1.4"/></svg>`,

  // Combined: HA → CI transition
  'Hearing Aid to Cochlear Implant': `<svg ${s}><path d="M3 7h3"/><path d="M4.5 5.5v3"/><path d="M8 7h3"/><circle cx="11.5" cy="7" r="1.2"/></svg>`,

  // ── Representation ─────────────────────────────────────────
  // ASL / Sign Language: signing hand
  'ASL': `<svg ${s}><path d="M4 9V5.5a1 1 0 0 1 2 0V8"/><path d="M6 7V4.5a1 1 0 0 1 2 0V8"/><path d="M8 7V5a1 1 0 0 1 2 0v3.5c0 2-1.5 3.5-3.5 3.5S3 11 3 10"/></svg>`,
  'Sign Language': `<svg ${s}><path d="M4 9V5.5a1 1 0 0 1 2 0V8"/><path d="M6 7V4.5a1 1 0 0 1 2 0V8"/><path d="M8 7V5a1 1 0 0 1 2 0v3.5c0 2-1.5 3.5-3.5 3.5S3 11 3 10"/></svg>`,
  'Signed Language': `<svg ${s}><path d="M4 9V5.5a1 1 0 0 1 2 0V8"/><path d="M6 7V4.5a1 1 0 0 1 2 0V8"/><path d="M8 7V5a1 1 0 0 1 2 0v3.5c0 2-1.5 3.5-3.5 3.5S3 11 3 10"/></svg>`,

  // Deaf: ear with X
  'Deaf': `<svg ${s}><path d="M4 4c1-1.5 3-2 4.5-.5s.8 3 .2 4.5c-.5 1-1.2 1.8-1.5 2.5"/><line x1="2" y1="2" x2="5" y2="5"/><line x1="5" y1="2" x2="2" y2="5"/></svg>`,

  // Hard of Hearing: ear with partial sound wave
  'Hard of Hearing': `<svg ${s}><path d="M4 4c1-1.5 3-2 4.5-.5s.8 3 .2 4.5c-.5 1-1.2 1.8-1.5 2.5"/><path d="M10.5 5c.3.5.5 1 .3 1.7" opacity=".6"/></svg>`,
  'Hearing Loss': `<svg ${s}><path d="M4 4c1-1.5 3-2 4.5-.5s.8 3 .2 4.5c-.5 1-1.2 1.8-1.5 2.5"/><path d="M10.5 5c.3.5.5 1 .3 1.7" opacity=".6"/></svg>`,

  // DeafBlind: ear + eye combined
  'DeafBlind': `<svg ${s}><path d="M1 7s2.5-3 6-3 6 3 6 3-2.5 3-6 3-6-3-6-3z"/><circle cx="7" cy="7" r="1.5"/><line x1="1" y1="12" x2="13" y2="2" stroke-width="1.5"/></svg>`,

  // Service Dog
  'Service Dog': `<svg ${s}><path d="M3 10c0-2 1-3 2.5-3.5L6 5l1-.5h1l1 .5.5 1.5c1.5.5 2.5 1.5 2.5 3.5"/><path d="M3 10h8"/><path d="M2.5 6.5L3 5l1-.5"/><circle cx="4.5" cy="4" r=".5" fill="currentColor" stroke="none"/></svg>`,

  // Captioning: CC badge
  'Captioning': `<svg ${s}><rect x="1" y="3" width="12" height="8" rx="1.5"/><text x="3.5" y="9.5" font-size="6" font-weight="bold" fill="currentColor" stroke="none" font-family="sans-serif">CC</text></svg>`,

  // Braille: six dots
  'Braille': `<svg ${s}><circle cx="4.5" cy="3.5" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="9.5" cy="3.5" r="1" fill="currentColor" stroke="none"/><circle cx="9.5" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="9.5" cy="10.5" r="1" fill="currentColor" stroke="none"/></svg>`,

  // Use of Interpreter
  'Use of Interpreter': `<svg ${s}><circle cx="5" cy="3.5" r="1.5"/><circle cx="10" cy="3.5" r="1.5"/><path d="M3 12v-2c0-1.5 1-2.5 2-2.5"/><path d="M12 12v-2c0-1.5-1-2.5-2-2.5"/><path d="M6 7l1.5-1L9 7"/></svg>`,

  // CODA
  'CODA': `<svg ${s}><circle cx="5" cy="4" r="1.8"/><circle cx="9.5" cy="7" r="1.3"/><path d="M3 12v-1.5c0-1.2 1-2 2-2s2 .8 2 2V12"/><path d="M8 12v-1c0-1 .7-1.7 1.5-1.7S11 10 11 11v1"/></svg>`,

  // Lip Reading
  'Lip Reading': `<svg ${s}><ellipse cx="7" cy="8" rx="3.5" ry="2.2"/><path d="M3.5 8c1 .8 2.5 1 3.5 0s2.5-.8 3.5 0"/></svg>`,

  // Deaf Culture
  'Deaf Culture': `<svg ${s}><path d="M4 4c1-1.5 3-2 4.5-.5s.8 3 .2 4.5"/><path d="M3 11c1.5 1 3.5 1.5 5.5.5s3-2 3.5-3"/><circle cx="7" cy="9" r=".5" fill="currentColor" stroke="none"/></svg>`,
};

/** Return an SVG icon string for the given tag, or empty string if none. */
export function getTagIconSvg(tag: string): string {
  return ICONS[tag] ?? '';
}

/** All tag names that have an icon. */
export const ICON_TAGS = new Set(Object.keys(ICONS));
