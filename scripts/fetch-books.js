/**
 * Fetches the book list from Google Sheets and writes it to src/content/books.json.
 * Run via: npm run fetch-books
 * Automatically runs before: npm run build
 *
 * The sheet must be shared as "Anyone with the link can view".
 */

import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SHEET_ID = '1lPzHX8GG2PWSnI_qCh6DLQ1leWxEwZykEX8Jk58jNIs';
const GID = '0';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
const OUT_PATH = join(__dirname, '../src/content/books.json');

// Map exact sheet column headers to internal field names
const COLUMN_MAP = {
  'Title':                  'title',
  'Author':                 'author',
  'Illustrator':            'illustrator',
  'Author Info':            'authorInfo',
  'Author Connection':      'authorConnectionRaw',
  'Cover Photo Link':       'coverImage',
  'Book Type':              'bookType',
  'Age Range':              'ageRange',
  'Age Groups':             'ageGroupsRaw',
  'Representation':         'representationRaw',
  'Equipment':              'equipmentRaw',
  'Main Character?':        'mainCharacterRaw',
  'Carnegie Library Link':  'carnegieLibraryLink',
  'Series':                 'series',
  'Series Number':          'seriesNumber',
  'Tags':                   'tagsRaw',
  'Published In':           'yearRaw',
  'Purchase Link':          'purchaseLink',
  'Landing Page?':          'landingPageRaw',
  'Summary':                'summary',
};

// =============================================================================
// CSV parsing
// =============================================================================

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

// =============================================================================
// Helpers
// =============================================================================

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Split a comma-separated cell value into a trimmed, non-empty array */
function splitList(raw) {
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/** Normalize known tag misspellings / duplicates */
const TAG_NORMALIZE = {
  'Religious':         'Religion',
  'LGTBQIA+':          'LGBTQIA+',
  'Treacher Collings':  'Treacher-Collins Syndrome',
  'Vehicles':           'Transportation',
};

function normalizeTags(tags) {
  return tags.map(t => TAG_NORMALIZE[t] || t);
}

/** Return value only if it looks like a URL; otherwise null */
function urlOrNull(raw) {
  if (!raw) return null;
  return raw.startsWith('http://') || raw.startsWith('https://') ? raw : null;
}

// =============================================================================
// Row -> book object
// =============================================================================

function transformRow(headers, values) {
  const raw = {};
  headers.forEach((header, i) => {
    const field = COLUMN_MAP[header];
    if (field) raw[field] = (values[i] ?? '').trim();
  });

  if (!raw.title) return null;

  return {
    id:                  slugify(raw.title),
    title:               raw.title,
    author:              raw.author || null,
    illustrator:         raw.illustrator || null,
    authorInfo:          raw.authorInfo || null,
    authorConnection:    splitList(raw.authorConnectionRaw),
    coverImage:          urlOrNull(raw.coverImage),
    bookType:            raw.bookType || null,
    ageRange:            raw.ageRange || null,
    ageGroups:           splitList(raw.ageGroupsRaw),
    representationTypes: splitList(raw.representationRaw),
    equipment:           splitList(raw.equipmentRaw),
    mainCharacter:       raw.mainCharacterRaw?.toUpperCase() === 'TRUE',
    carnegieLibraryLink: urlOrNull(raw.carnegieLibraryLink),
    series:              raw.series || null,
    seriesNumber:        raw.seriesNumber ? parseInt(raw.seriesNumber, 10) || null : null,
    tags:                normalizeTags(splitList(raw.tagsRaw)),
    publicationYear:     raw.yearRaw ? parseInt(raw.yearRaw, 10) || null : null,
    purchaseLink:        urlOrNull(raw.purchaseLink),
    landingPage:         raw.landingPageRaw?.toUpperCase() === 'TRUE',
    summary:             raw.summary || null,
  };
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('Fetching book data from Google Sheets...');

  let csvText;
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    csvText = await res.text();
  } catch (err) {
    console.warn(`Warning: Fetch failed: ${err.message}`);
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
  console.log(`Wrote ${books.length} books to src/content/books.json`);
}

main();
