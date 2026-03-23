/**
 * Fetches the book list from Google Sheets and writes it to src/content/books.json.
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
const OUT_PATH = join(__dirname, '../src/content/books.json');

// Map exact sheet column headers to internal field names
const COLUMN_MAP = {
  'Book Title:':                          'title',
  'Author Name:':                         'author',
  'Illustrator:':                         'illustrator',
  'Author Info (DHH/DB/CODA/Parent of):': 'authorInfo',
  'Cover Photo Link:':                    'coverImage',
  'Age Range (Board/Picture/Chapter):':   'ageRangeRaw',
  'Representation:':                      'representationRaw',
  'Main Character?':                      'mainCharacterRaw',
  'Available at Carnegie Library?':       'libraryRaw',
  'Published in:':                        'yearRaw',
};

// =============================================================================
// Book Type normalization
// =============================================================================

const BOOK_TYPE_MAP = {
  'Chapter':                        'Chapter Book',
  'Picture':                        'Picture Book',
  'Board':                          'Board Book',
  'Picture Book':                   'Picture Book',
  'Chapter Book':                   'Chapter Book',
  'Board Book':                     'Board Book',
  'Board Books':                    'Board Book',
  'Graphic Novel':                  'Graphic Novel',
  'Manga':                          'Manga',
  'Children':                       "Children's",
  "Children's":                     "Children's",
  'Chater':                         'Chapter Book',
  'Pictures':                       'Picture Book',
  'Chapter Book with Pictures':     'Chapter Book',
  '*Augmented Reality Picture Book': 'Picture Book',
  'Comic':                          'Graphic Novel',
  'Short Stories':                   'Short Stories',
  'Activity Book':                   'Activity Book',
};

// Handle compound types like "Picture Book, Board Book" — take the first
function normalizeBookType(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (BOOK_TYPE_MAP[trimmed]) return BOOK_TYPE_MAP[trimmed];
  // Try the first part if comma-separated
  const first = trimmed.split(',')[0].trim();
  if (BOOK_TYPE_MAP[first]) return BOOK_TYPE_MAP[first];
  return trimmed;
}

// =============================================================================
// Age Range normalization
// =============================================================================

const AGE_GROUPS = [
  { label: 'Baby & Toddler', min: 0, max: 2 },
  { label: 'Ages 3-5',       min: 3, max: 5 },
  { label: 'Ages 6-8',       min: 6, max: 8 },
  { label: 'Ages 9-12',      min: 9, max: 12 },
  { label: 'Teen',           min: 13, max: 18 },
  { label: 'Adult',          min: 19, max: 99 },
];

// Convert grade level to approximate age
function gradeToAge(grade) {
  const g = grade.trim().toUpperCase();
  if (g === 'K') return 5;
  const n = parseInt(g, 10);
  if (!isNaN(n)) return n + 5; // Grade 1 ≈ age 6
  return null;
}

// Parse a raw age string into { min, max } ages
function parseAgeNumbers(raw) {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();

  // Skip non-age values
  if (s === 'nonfiction') return null;

  // "Adult"
  if (s === 'adult') return { min: 19, max: 99 };

  // "High School"
  if (s === 'high school') return { min: 14, max: 18 };

  // "Older Elem."
  if (s.includes('older elem')) return { min: 9, max: 12 };

  // Grade ranges: "Gr K-3", "Gr 5+", "Grade 9-12", "Grades 7-9"
  const gradeMatch = s.match(/gr(?:ade)?s?\s+(\w+)\s*[-–]\s*(\w+)/i);
  if (gradeMatch) {
    const lo = gradeToAge(gradeMatch[1]);
    const hi = gradeToAge(gradeMatch[2]);
    if (lo !== null && hi !== null) return { min: lo, max: hi };
  }
  const gradeOpen = s.match(/gr(?:ade)?s?\s+(\w+)\s*\+/i);
  if (gradeOpen) {
    const lo = gradeToAge(gradeOpen[1]);
    if (lo !== null) return { min: lo, max: lo + 5 };
  }

  // "Baby-7 Years" / "Baby-10 years"
  const babyMatch = s.match(/baby\s*[-–]\s*(\d+)/i);
  if (babyMatch) return { min: 0, max: parseInt(babyMatch[1], 10) };

  // "Age 7-8" / "age 3-5" / "ages 2-8"
  // "3-7 years" / "0 to 10 years" / "12+"
  const rangeMatch = s.match(/(\d+)\s*(?:[-–]|to)\s*(\d+)/);
  if (rangeMatch) return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };

  const openMatch = s.match(/(\d+)\s*\+/);
  if (openMatch) {
    const lo = parseInt(openMatch[1], 10);
    return { min: lo, max: lo + 5 };
  }

  return null;
}

// Assign one or more age group labels based on the numeric range
function computeAgeGroups(raw) {
  const range = parseAgeNumbers(raw);
  if (!range) return [];

  return AGE_GROUPS
    .filter(g => range.min <= g.max && range.max >= g.min)
    .map(g => g.label);
}

// =============================================================================
// Author Info normalization
// =============================================================================

// Keywords to search for in the freeform author info text
const AUTHOR_CONNECTION_RULES = [
  { pattern: /\bDeafBlind\b|\bDB\b|\bUsher/i, label: 'DeafBlind' },
  { pattern: /\bDHH\b|\bDeaf\b|\bHoH\b|\bHard of Hearing\b|\bhearing loss\b|\bmeningitis\b/i, label: 'D/HH' },
  { pattern: /\bCODA\b|\bSODA\b/i, label: 'CODA' },
  { pattern: /\bParent\b|\bMother\b|\bFather\b|\bMom\b|\bDad\b/i, label: 'Parent' },
  { pattern: /\bGrand(?:parent|mother|father)\b/i, label: 'Family' },
  { pattern: /\bSibling\b|\bAunt\b|\bGreat Aunt\b|\bCousin\b|\bGodparent\b|\bSpouse\b|\bFamily\b/i, label: 'Family' },
  { pattern: /\bTOD\b|\bTODHH\b|\bTeacher\b/i, label: 'Educator' },
  { pattern: /\bSLP\b|\bAudiolog\b|\bTherapist\b|\bSurgeon\b|\bCounselor\b|\bOccupational\b/i, label: 'Professional' },
  { pattern: /\bInterpret/i, label: 'Interpreter' },
];

function computeAuthorConnection(raw) {
  if (!raw) return [];
  const matches = [];
  for (const rule of AUTHOR_CONNECTION_RULES) {
    if (rule.pattern.test(raw) && !matches.includes(rule.label)) {
      matches.push(rule.label);
    }
  }
  return matches;
}

// =============================================================================
// Representation / Equipment normalization
// =============================================================================

const TAG_MAP = {
  // Equipment abbreviations
  'HA':             'Hearing Aid',
  'CI':             'Cochlear Implant',
  'FM':             'FM System',
  'HAT':            'FM System',
  'HA to CI':       'Hearing Aid to Cochlear Implant',
  'HA to CIs':      'Hearing Aid to Cochlear Implant',

  // Sign languages
  'ASL':            'ASL',
  'BSL':            'British Sign Language',
  'BASL':           'Black ASL',
  'Auslan':         'Auslan',
  'TC':             'Total Communication',
  'LSL':            'Listening & Spoken Language',

  // Identity / representation
  'DB':             'DeafBlind',
  'CODA':           'CODA',
  'HoH':            'Hard of Hearing',
  'DHH':            'Deaf/Hard of Hearing',
  'DHH Character':  'Deaf/Hard of Hearing',
  'DHH Characters': 'Deaf/Hard of Hearing',
  'Deaf Character': 'Deaf',
  'Deaf Animal':    'Deaf',
  'Hard of Hearing Character': 'Hard of Hearing',
  'ANSD':           'Auditory Neuropathy',

  // Communication
  'AAC':            'AAC',
  'PECS':           'PECS',

  // Typo corrections
  'Signed Langauge':  'Signed Language',
  'Signed Lanugage':  'Signed Language',
  'Accomodations':    'Accommodations',
  'ASL?':             'ASL',
  'ASL)':             'ASL',

  // Case variants
  'Lip reading':     'Lip Reading',
  'lipreading':      'Lip Reading',
  'Lipreading':      'Lip Reading',
  'hearing loss':    'Hearing Loss',

  // Consolidations
  '19 DHH Stories':               'Deaf/Hard of Hearing',
  'Deaf Awareness Month':         'Deaf Culture',
  'Hearing Devices':              'Hearing Aid',
  'Unilateral HA':                'Hearing Aid',
  'Acquired HL':                  'Hearing Loss',
  'Conductive HL':                'Hearing Loss',
  'Progressive Hearing Loss':     'Hearing Loss',
  'Sudden Hearing Loss':          'Hearing Loss',
  'Hearing Loss Secondary to stroke': 'Hearing Loss',
  'Fluctuating':                  'Hearing Loss',
  'Sibling with Hearing loss':    'Sibling Perspective',
  'sibling of children with hearing loss': 'Sibling Perspective',
  'Various':                      'Various',
  'Variety':                      'Various',
  'Various Perspectives':         'Various',
  'Various Parent Perspectives':  'Various',
  'Various Disabilities':         'Various',
  'Multiple Disabilities':        'Multiple Disabilities',
  'Other Disabilities':           'Multiple Disabilities',
  'All Communication':            'Multiple Communication Modalities',
  'Multiple Modalities':          'Multiple Communication Modalities',
  'Assistive Tech':               'Assistive Technology',
  'Assistive Technology':         'Assistive Technology',
  'Hearing Assistance Dog':       'Service Dog',
  'Guide Dog':                    'Service Dog',
  'Support Dog':                  'Service Dog',
  'General Knowledge':            'General Knowledge',

  // Compound entries that survive slash-splitting
  'Treacher-Collins Syndrome':    'Treacher-Collins Syndrome',
  'CHARGE':                       'CHARGE Syndrome',
  'Cerebral Palsy':               'Cerebral Palsy',

  // Broken parenthetical fragments from commas inside sheet notes
  'Filipino Sign Language (FSL':  'Filipino Sign Language',
  'Filipino Sign Langauge (FSL)': 'Filipino Sign Language',
  'ASL and LSM (Mexican Sign Langauge)': 'ASL',
  'ASL and LSM (Mexican Sign Language':  'ASL',
  'Cerebral Palsy (animal characters)':  'Cerebral Palsy',
  'Cerebral Palsy (animal characters':   'Cerebral Palsy',
  'Hearing Loss (no devices)':           'Hearing Loss',
};

const TAG_MAP_LOWER = {};
for (const [key, val] of Object.entries(TAG_MAP)) {
  TAG_MAP_LOWER[key.toLowerCase()] = val;
}

const EQUIPMENT_TAGS = new Set([
  'Hearing Aid',
  'Cochlear Implant',
  'Hearing Aid to Cochlear Implant',
  'BAHA',
  'FM System',
  'Assistive Technology',
]);

const IGNORE_TAGS = new Set([
  'etc.)',
  'TTY)',
  'phones',
  '',
]);

// -- Tag normalization --------------------------------------------------------

function normalizeTag(raw) {
  let tag = raw.replace(/^\(+|\)+$/g, '').trim();
  if (!tag || tag === '-') return null;

  if (TAG_MAP[tag]) return TAG_MAP[tag];
  if (TAG_MAP_LOWER[tag.toLowerCase()]) return TAG_MAP_LOWER[tag.toLowerCase()];

  const parenMatch = tag.match(/^(.+?)\s*\(.*$/);
  if (parenMatch) {
    const base = parenMatch[1].trim();
    if (TAG_MAP[base]) return TAG_MAP[base];
    if (TAG_MAP_LOWER[base.toLowerCase()]) return TAG_MAP_LOWER[base.toLowerCase()];
  }

  tag = tag.replace(/\s*\([^)]*\)\s*$/, '').trim();
  tag = tag.replace(/Langauge/g, 'Language');
  tag = tag.replace(/Lanugage/g, 'Language');

  return tag || null;
}

function parseRepresentation(raw) {
  if (!raw) return { representationTypes: [], equipment: [] };

  const tokens = raw.split(',').flatMap(part => {
    const trimmed = part.trim();
    if (!trimmed) return [];
    if (TAG_MAP[trimmed] || TAG_MAP_LOWER[trimmed.toLowerCase()]) return [trimmed];
    return trimmed.split(/\s*[\/&]\s*/);
  });

  const normalized = tokens
    .map(t => t.trim())
    .filter(t => !IGNORE_TAGS.has(t))
    .map(normalizeTag)
    .filter(Boolean);

  const unique = [...new Set(normalized)];

  return {
    representationTypes: unique.filter(t => !EQUIPMENT_TAGS.has(t)),
    equipment: unique.filter(t => EQUIPMENT_TAGS.has(t)),
  };
}

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
// Row -> book object
// =============================================================================

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseAgeRangeColumn(raw) {
  if (!raw) return { bookType: null, ageRange: null };

  const match = raw.match(/^(.+?)\s*\(([^)]+)\)/);
  if (match) {
    return {
      bookType: normalizeBookType(match[1].trim()),
      ageRange: match[2].trim(),
    };
  }

  return { bookType: normalizeBookType(raw.trim()), ageRange: null };
}

function parseAuthorInfo(raw) {
  if (!raw || raw === '-') return null;
  return raw.trim();
}

function transformRow(headers, values) {
  const raw = {};
  headers.forEach((header, i) => {
    const field = COLUMN_MAP[header];
    if (field) raw[field] = (values[i] ?? '').trim();
  });

  if (!raw.title) return null;

  const { bookType, ageRange } = parseAgeRangeColumn(raw.ageRangeRaw);
  const { representationTypes, equipment } = parseRepresentation(raw.representationRaw);
  const authorInfo = parseAuthorInfo(raw.authorInfo);

  return {
    id:                  slugify(raw.title),
    title:               raw.title,
    author:              raw.author || null,
    illustrator:         raw.illustrator || null,
    authorInfo,
    authorConnection:    computeAuthorConnection(authorInfo),
    coverImage:          raw.coverImage || null,
    bookType,
    ageRange,
    ageGroups:           computeAgeGroups(ageRange),
    representationTypes,
    equipment,
    mainCharacter:       raw.mainCharacterRaw?.toUpperCase() === 'X',
    libraryAvailable:    raw.libraryRaw === 'X' ? true : raw.libraryRaw === '-' ? false : null,
    publicationYear:     raw.yearRaw ? parseInt(raw.yearRaw, 10) || null : null,
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

  // Load existing books.json to preserve fields not in the Google Sheet (e.g. purchaseLink)
  let existingById = {};
  if (existsSync(OUT_PATH)) {
    try {
      const existing = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
      for (const book of existing) {
        if (book.id) existingById[book.id] = book;
      }
    } catch { /* ignore parse errors */ }
  }

  const books = lines
    .slice(1)
    .map(line => parseCSVLine(line))
    .map(values => transformRow(headers, values))
    .filter(Boolean)
    .map(book => ({
      ...book,
      purchaseLink: existingById[book.id]?.purchaseLink ?? null,
    }));

  writeFileSync(OUT_PATH, JSON.stringify(books, null, 2));
  console.log(`Wrote ${books.length} books to src/content/books.json`);
}

main();
