/**
 * Fetches the book list from Google Sheets and writes it to src/data/books.json.
 * Run via: npm run fetch-books
 * Automatically runs before: npm run build
 *
 * The sheet must be shared as "Anyone with the link can view".
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SHEET_ID = '1qkrkNlCz6hyVhS0qJBy_o4AiEOK-1Z2shtHaHvAJd2I';
const GID = '0';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
const OUT_PATH = join(__dirname, '../src/data/books.json');

// Map exact sheet column headers → internal field names
const COLUMN_MAP = {
  'Book Title:':                          'title',
  'Author Name:':                         'author',
  'Author Info (DHH/DB/CODA/Parent of):': 'authorInfo',
  'Cover Photo Link:':                    'coverImage',
  'Age Range (Board/Picture/Chapter):':   'ageRangeRaw',
  'Representation:':                      'representationRaw',
  'Main Character?':                      'mainCharacterRaw',
  'Available at Carnegie Library?':       'libraryRaw',
  'Published in:':                        'yearRaw',
};

// Normalize representation abbreviations to full labels
const REPRESENTATION_LABELS = {
  'HA':         'Hearing Aid',
  'CI':         'Cochlear Implant',
  'ASL':        'ASL',
  'BSL':        'British Sign Language',
  'DB':         'DeafBlind',
  'CODA':       'CODA',
  'Auslan':     'Auslan',
  'HA to CIs':  'Hearing Aid → Cochlear Implant',
};

// Normalize the leading book type word to a consistent label
const BOOK_TYPE_LABELS = {
  'Chapter':       'Chapter Book',
  'Picture':       'Picture Book',
  'Board':         'Board Book',
  'Picture Book':  'Picture Book',
  'Chapter Book':  'Chapter Book',
  'Board Book':    'Board Book',
  'Graphic Novel': 'Graphic Novel',
  'Manga':         'Manga',
  'Children':      "Children's",
};

// ── CSV parsing ──────────────────────────────────────────────────────────────

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ── Field transformations ─────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// "Chapter (Gr 7-9)" → { bookType: "Chapter Book", ageRange: "Gr 7-9" }
// "Picture"          → { bookType: "Picture Book", ageRange: null }
function parseAgeRange(raw) {
  if (!raw) return { bookType: null, ageRange: null };

  const match = raw.match(/^(.+?)\s*\(([^)]+)\)/);
  if (match) {
    const typeRaw = match[1].trim();
    return {
      bookType: BOOK_TYPE_LABELS[typeRaw] ?? typeRaw,
      ageRange: match[2].trim(),
    };
  }

  const typeRaw = raw.trim();
  return { bookType: BOOK_TYPE_LABELS[typeRaw] ?? typeRaw, ageRange: null };
}

// "HA, ASL" → ["Hearing Aid", "ASL"]
function parseRepresentation(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => REPRESENTATION_LABELS[s] ?? s);
}

// "-" or "" → null  |  "DHH" → "DHH"  |  "Parent" → "Parent"
function parseAuthorInfo(raw) {
  if (!raw || raw === '-') return null;
  return raw.trim();
}

// ── Row → book object ─────────────────────────────────────────────────────────

function transformRow(headers, values) {
  const raw = {};
  headers.forEach((header, i) => {
    const field = COLUMN_MAP[header];
    if (field) raw[field] = (values[i] ?? '').trim();
  });

  if (!raw.title) return null;

  const { bookType, ageRange } = parseAgeRange(raw.ageRangeRaw);

  return {
    id:                  slugify(raw.title),
    title:               raw.title,
    author:              raw.author || null,
    authorInfo:          parseAuthorInfo(raw.authorInfo),
    coverImage:          raw.coverImage || null,
    bookType,
    ageRange,
    representationTypes: parseRepresentation(raw.representationRaw),
    mainCharacter:       raw.mainCharacterRaw?.toUpperCase() === 'X',
    libraryAvailable:    raw.libraryRaw === 'X' ? true : raw.libraryRaw === '-' ? false : null,
    publicationYear:     raw.yearRaw ? parseInt(raw.yearRaw, 10) || null : null,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching book data from Google Sheets…');

  let csvText;
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    csvText = await res.text();
  } catch (err) {
    console.warn(`⚠ Fetch failed: ${err.message}`);
    if (existsSync(OUT_PATH)) {
      console.warn('  Using existing books.json as fallback.');
      return;
    }
    console.error('  No fallback available. Exiting.');
    process.exit(1);
  }

  const lines = csvText.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);

  const books = lines
    .slice(1)
    .map(line => parseCSVLine(line))
    .map(values => transformRow(headers, values))
    .filter(Boolean);

  writeFileSync(OUT_PATH, JSON.stringify(books, null, 2));
  console.log(`✓ Wrote ${books.length} books to src/data/books.json`);
}

main();
