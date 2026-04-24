/**
 * Fetches the book list from Google Sheets and writes it to src/content/books.json.
 * Run via: npm run fetch-books
 * Automatically runs before: npm run build
 *
 * The sheet must be shared as "Anyone with the link can view".
 *
 * We fetch the xlsx export (not CSV) so that Google Sheets hyperlinks — where a
 * volunteer typed display text and attached a URL via Insert → Link — come
 * through. CSV export silently drops those URLs.
 */

import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { unzipSync, strFromU8 } from 'fflate';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SHEET_ID = '1lPzHX8GG2PWSnI_qCh6DLQ1leWxEwZykEX8Jk58jNIs';
const GID = '0';
const XLSX_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx&gid=${GID}`;
const OUT_PATH = join(__dirname, '../src/content/books.json');

// Map exact sheet column headers to internal field names
const COLUMN_MAP = {
  'Title':                   'title',
  'Author':                  'author',
  'Illustrator':             'illustrator',
  'Author Connection':       'authorConnectionRaw',
  'Illustrator Connection':  'illustratorConnectionRaw',
  'Cover Photo Link':        'coverImage',
  'Book Type':               'bookType',
  'Age Groups':              'ageGroupsRaw',
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
  'Languages Available':    'languagesRaw',
};

// Columns where the sheet cell often contains linked display text rather than a
// raw URL. For these we prefer the cell's attached hyperlink over its text.
const LINK_FIELDS = new Set(['coverImage', 'carnegieLibraryLink', 'purchaseLink']);

// =============================================================================
// xlsx parsing (minimal — just what we need)
// =============================================================================

const XML_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeXml(s) {
  return s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g, (_, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return XML_ENTITIES[e];
  });
}

/** Parse sharedStrings.xml into an array indexed by shared-string ID. */
function parseSharedStrings(xml) {
  const out = [];
  for (const si of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    // Concatenate every <t>…</t> inside (covers both plain and rich text).
    let text = '';
    for (const t of si[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) text += t[1];
    out.push(decodeXml(text));
  }
  return out;
}

/** Parse sheet rels into { relId → target URL }. */
function parseRels(xml) {
  const map = {};
  for (const m of xml.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    map[m[1]] = decodeXml(m[2]);
  }
  return map;
}

/** Split a cell ref like "F42" into { col: "F", row: 42 }. */
function splitCellRef(ref) {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  return m ? { col: m[1], row: parseInt(m[2], 10) } : null;
}

/**
 * Parse sheet1.xml into a row-indexed map of cells:
 *   rows[rowNum] = { [colLetter]: { value: string, hyperlink?: string } }
 */
function parseSheet(xml, sharedStrings, rels) {
  const rows = {};

  // Cells, matching both <c .../> (empty) and <c ...>…</c> (with value).
  for (const cell of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = cell[1];
    const inner = cell[2] ?? '';
    const refMatch = attrs.match(/\br="([^"]+)"/);
    if (!refMatch) continue;
    const ref = splitCellRef(refMatch[1]);
    if (!ref) continue;
    const typeMatch = attrs.match(/\bt="([^"]+)"/);
    const type = typeMatch ? typeMatch[1] : null;

    let value = '';
    if (type === 's') {
      const v = inner.match(/<v>([\s\S]*?)<\/v>/);
      if (v) value = sharedStrings[parseInt(v[1], 10)] ?? '';
    } else if (type === 'inlineStr') {
      let text = '';
      for (const t of inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) text += t[1];
      value = decodeXml(text);
    } else if (type === 'b') {
      // Boolean cells serialize as 1/0 — convert to the TRUE/FALSE strings the
      // rest of the pipeline expects.
      const v = inner.match(/<v>([\s\S]*?)<\/v>/);
      value = v && v[1].trim() === '1' ? 'TRUE' : 'FALSE';
    } else {
      const v = inner.match(/<v>([\s\S]*?)<\/v>/);
      if (v) value = decodeXml(v[1]);
    }

    if (!rows[ref.row]) rows[ref.row] = {};
    rows[ref.row][ref.col] = { value };
  }

  // Hyperlinks: <hyperlink r:id="rId5" ref="F4"/>
  for (const hl of xml.matchAll(/<hyperlink\b([^/]*)\/>/g)) {
    const attrs = hl[1];
    const idMatch = attrs.match(/r:id="([^"]+)"/);
    const refAttr = attrs.match(/\bref="([^"]+)"/);
    if (!idMatch || !refAttr) continue;
    const url = rels[idMatch[1]];
    if (!url) continue;
    const ref = splitCellRef(refAttr[1]);
    if (!ref) continue;
    if (!rows[ref.row]) rows[ref.row] = {};
    const cell = rows[ref.row][ref.col] ?? (rows[ref.row][ref.col] = { value: '' });
    cell.hyperlink = url;
  }

  return rows;
}

// =============================================================================
// Helpers
// =============================================================================

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function splitList(raw) {
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

const TAG_NORMALIZE = {
  'Religious':         'Religion',
  'LGTBQIA+':          'LGBTQIA+',
  'Treacher Collings':  'Treacher-Collins Syndrome',
  'Vehicles':           'Transportation',
};

function normalizeTags(tags) {
  return tags.map(t => TAG_NORMALIZE[t] || t);
}

function urlOrNull(raw) {
  if (!raw) return null;
  return raw.startsWith('http://') || raw.startsWith('https://') ? raw : null;
}

/**
 * Google Drive `/file/d/{ID}/view` URLs point to the viewer page, not the
 * image bytes, so they can't be used as an <img src>. Rewrite them to the
 * lh3 thumbnail endpoint, which serves the file directly (subject to the
 * Drive file being shared publicly).
 */
function rewriteDriveUrl(url) {
  if (!url) return url;
  const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;
  const open = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (open) return `https://lh3.googleusercontent.com/d/${open[1]}`;
  return url;
}

/** Pick the best URL for a linked cell: hyperlink first, else raw URL text. */
function resolveLink(cell) {
  if (!cell) return null;
  if (cell.hyperlink) return cell.hyperlink;
  return urlOrNull(cell.value);
}

// =============================================================================
// Row -> book object
// =============================================================================

function transformRow(headerColMap, rowCells) {
  const raw = {};
  for (const [col, field] of Object.entries(headerColMap)) {
    const cell = rowCells[col];
    if (LINK_FIELDS.has(field)) {
      raw[field] = resolveLink(cell);
    } else {
      raw[field] = (cell?.value ?? '').trim();
    }
  }

  if (!raw.title) return null;

  const coverRaw = raw.coverImage;
  const coverImage = coverRaw ? rewriteDriveUrl(coverRaw) : null;

  return {
    id:                  slugify(raw.title),
    title:               raw.title,
    author:                  raw.author || null,
    illustrator:             raw.illustrator || null,
    authorConnection:        splitList(raw.authorConnectionRaw),
    illustratorConnection:   splitList(raw.illustratorConnectionRaw),
    coverImage,
    bookType:                raw.bookType || null,
    ageGroups:               splitList(raw.ageGroupsRaw),
    representationTypes: splitList(raw.representationRaw),
    equipment:           splitList(raw.equipmentRaw),
    mainCharacter:       raw.mainCharacterRaw?.toUpperCase() === 'TRUE',
    carnegieLibraryLink: raw.carnegieLibraryLink || null,
    series:              raw.series || null,
    seriesNumber:        raw.seriesNumber ? parseInt(raw.seriesNumber, 10) || null : null,
    tags:                normalizeTags(splitList(raw.tagsRaw)),
    publicationYear:     raw.yearRaw ? parseInt(raw.yearRaw, 10) || null : null,
    purchaseLink:        raw.purchaseLink || null,
    landingPage:         raw.landingPageRaw?.toUpperCase() === 'TRUE',
    summary:             raw.summary || null,
    languages:           splitList(raw.languagesRaw),
  };
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('Fetching book data from Google Sheets (xlsx)...');

  let xlsxBuf;
  try {
    const res = await fetch(XLSX_URL, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    xlsxBuf = new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    console.warn(`Warning: Fetch failed: ${err.message}`);
    if (existsSync(OUT_PATH)) {
      console.warn('  Using existing books.json as fallback.');
      return;
    }
    console.error('  No fallback available. Exiting.');
    process.exit(1);
  }

  const files = unzipSync(xlsxBuf, {
    filter: f => f.name === 'xl/sharedStrings.xml'
              || f.name === 'xl/worksheets/sheet1.xml'
              || f.name === 'xl/worksheets/_rels/sheet1.xml.rels',
  });

  const sharedStrings = files['xl/sharedStrings.xml']
    ? parseSharedStrings(strFromU8(files['xl/sharedStrings.xml']))
    : [];
  const rels = files['xl/worksheets/_rels/sheet1.xml.rels']
    ? parseRels(strFromU8(files['xl/worksheets/_rels/sheet1.xml.rels']))
    : {};
  const sheetXml = strFromU8(files['xl/worksheets/sheet1.xml']);
  const rows = parseSheet(sheetXml, sharedStrings, rels);

  // Build header column → field map from row 1.
  const headerRow = rows[1] ?? {};
  const headerColMap = {};
  for (const [col, cell] of Object.entries(headerRow)) {
    const field = COLUMN_MAP[cell.value?.trim()];
    if (field) headerColMap[col] = field;
  }

  const rowNums = Object.keys(rows).map(Number).filter(n => n > 1).sort((a, b) => a - b);
  const books = rowNums
    .map(n => transformRow(headerColMap, rows[n]))
    .filter(Boolean);

  const withCover = books.filter(b => b.coverImage).length;

  writeFileSync(OUT_PATH, JSON.stringify(books, null, 2));
  console.log(`Wrote ${books.length} books to src/content/books.json (${withCover} with cover images)`);
}

main();
