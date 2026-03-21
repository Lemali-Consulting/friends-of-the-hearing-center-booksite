/**
 * Fetches book metadata (cover URLs, ISBNs, descriptions) from Open Library
 * and Google Books for each book in books.json. Writes results to
 * src/content/metadata.json.
 *
 * Run via: npm run fetch-metadata
 *
 * The script is incremental — it skips books that already have an entry in metadata.json.
 * To re-fetch a specific book, delete its entry from metadata.json and re-run.
 *
 * Pass --google-backfill to only query Google Books for entries that Open Library missed.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BOOKS_PATH = join(__dirname, '../src/content/books.json');
const METADATA_PATH = join(__dirname, '../src/content/metadata.json');

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json';
const COVER_BASE = 'https://covers.openlibrary.org/b/id';
const GOOGLE_BOOKS_SEARCH = 'https://www.googleapis.com/books/v1/volumes';

const REQUEST_DELAY = 150;
const USER_AGENT = 'FriendsOfHearingCenter-BookSite/1.0 (book cover fetcher)';

// Google Books returns this exact-size PNG as a "no image available" placeholder
const GOOGLE_PLACEHOLDER_SIZE = 15567;

// Known placeholder image MD5 hashes (e.g. Open Library "No image available")
const PLACEHOLDER_HASHES = new Set([
  '681e43bb536038b0ecb97ed0c13b5948', // Open Library "No image available" JPEG
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// -- Open Library -------------------------------------------------------------

async function searchOpenLibrary(title, author) {
  const params = new URLSearchParams({
    title,
    limit: '5',
    fields: 'key,title,author_name,cover_i,isbn,first_sentence',
  });
  if (author) params.set('author', author);

  const res = await fetch(`${OPEN_LIBRARY_SEARCH}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Open Library HTTP ${res.status} for "${title}"`);
  }

  const data = await res.json();
  if (!data.docs || data.docs.length === 0) return null;

  const scored = data.docs.map(doc => {
    let score = 0;
    if (doc.cover_i) score += 10;
    if (doc.isbn && doc.isbn.length > 0) score += 5;
    if (doc.isbn?.find(i => i.length === 13)) score += 2;
    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].doc;

  const coverId = best.cover_i;
  const coverUrl = coverId ? `${COVER_BASE}/${coverId}-L.jpg` : null;

  let isbn = null;
  if (best.isbn && best.isbn.length > 0) {
    isbn = best.isbn.find(i => i.length === 13) || best.isbn[0];
  }

  const description = Array.isArray(best.first_sentence) ? best.first_sentence[0] || null : null;

  return { coverUrl, isbn, olid: best.key || null, description };
}

// -- Google Books -------------------------------------------------------------

async function searchGoogleBooks(title, author) {
  // Build a query like: intitle:"27 Hours" inauthor:"Tristina Wright"
  let q = `intitle:"${title}"`;
  if (author) {
    // Use first author only (before comma/ampersand)
    const primary = author.split(/[,&]/)[0].trim();
    q += ` inauthor:"${primary}"`;
  }

  const params = new URLSearchParams({
    q,
    maxResults: '5',
    printType: 'books',
    fields: 'items(volumeInfo(title,authors,imageLinks,industryIdentifiers,description))',
  });

  const res = await fetch(`${GOOGLE_BOOKS_SEARCH}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Google Books HTTP ${res.status} for "${title}"`);
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) return null;

  // Score results: prefer those with a cover and ISBN-13
  const scored = data.items.map(item => {
    const vi = item.volumeInfo || {};
    let score = 0;
    if (vi.imageLinks?.thumbnail) score += 10;
    const ids = vi.industryIdentifiers || [];
    if (ids.some(id => id.type === 'ISBN_13')) score += 7;
    else if (ids.some(id => id.type === 'ISBN_10')) score += 4;
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].item.volumeInfo;

  // Get cover — upgrade to higher res by removing zoom/edge params
  let coverUrl = null;
  if (best.imageLinks?.thumbnail) {
    // Google returns http URLs with zoom=1; upgrade to https and larger size
    coverUrl = best.imageLinks.thumbnail
      .replace('http://', 'https://')
      .replace('&edge=curl', '')
      .replace('zoom=1', 'zoom=2');
  }

  // Get ISBN — prefer ISBN-13
  let isbn = null;
  const ids = best.industryIdentifiers || [];
  const isbn13 = ids.find(id => id.type === 'ISBN_13');
  const isbn10 = ids.find(id => id.type === 'ISBN_10');
  isbn = isbn13?.identifier || isbn10?.identifier || null;

  const description = best.description || null;

  return { coverUrl, isbn, description };
}

// -- Cover URL validation -----------------------------------------------------

/**
 * Checks whether a cover URL points to a real image or a placeholder/error.
 * Returns true if the image is valid, false if it should be discarded.
 */
async function isValidCover(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!res.ok) return false;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return false;

    const buf = Buffer.from(await res.arrayBuffer());

    // Google Books "no image available" placeholder is exactly this size
    if (url.includes('books.google.com') && buf.length === GOOGLE_PLACEHOLDER_SIZE) {
      return false;
    }

    // Check against known placeholder image hashes
    const hash = createHash('md5').update(buf).digest('hex');
    if (PLACEHOLDER_HASHES.has(hash)) return false;

    // Very small images (< 1000 bytes) are likely placeholders or 1x1 pixels
    if (buf.length < 1000) return false;

    return true;
  } catch {
    return false;
  }
}

// -- Main ---------------------------------------------------------------------

async function main() {
  const googleBackfillOnly = process.argv.includes('--google-backfill');
  const validateOnly = process.argv.includes('--validate-only');

  if (!existsSync(BOOKS_PATH)) {
    console.error('books.json not found. Run `npm run fetch-books` first.');
    process.exit(1);
  }

  const books = JSON.parse(readFileSync(BOOKS_PATH, 'utf-8'));

  let covers = {};
  if (existsSync(METADATA_PATH)) {
    covers = JSON.parse(readFileSync(METADATA_PATH, 'utf-8'));
    console.log(`Loaded ${Object.keys(covers).length} existing entries from metadata.json`);
  }

  // ── Phase 1: Open Library (skip if --google-backfill or --validate-only) ──

  if (!googleBackfillOnly && !validateOnly) {
    const toFetch = books.filter(b => !(b.id in covers));
    console.log(`\n── Open Library ──`);
    console.log(`${toFetch.length} books to look up\n`);

    let found = 0, missed = 0, errors = 0;

    for (let i = 0; i < toFetch.length; i++) {
      const book = toFetch[i];
      const progress = `[${i + 1}/${toFetch.length}]`;

      try {
        const result = await searchOpenLibrary(book.title, book.author);
        if (result) {
          covers[book.id] = { coverUrl: result.coverUrl, isbn: result.isbn, olid: result.olid, description: result.description || null };
          const status = result.coverUrl ? 'cover + ' : 'no cover, ';
          console.log(`${progress} ${book.title} -> ${status}isbn: ${result.isbn || 'none'}`);
          found++;
        } else {
          covers[book.id] = { coverUrl: null, isbn: null, olid: null, description: null };
          console.log(`${progress} ${book.title} -> not found`);
          missed++;
        }
      } catch (err) {
        console.warn(`${progress} ${book.title} -> ERROR: ${err.message}`);
        errors++;
      }

      if ((i + 1) % 50 === 0 || i === toFetch.length - 1) {
        writeFileSync(METADATA_PATH, JSON.stringify(covers, null, 2));
      }
      if (i < toFetch.length - 1) await sleep(REQUEST_DELAY);
    }

    console.log(`\nOpen Library done — Found: ${found}, Missed: ${missed}, Errors: ${errors}`);
  }

  // ── Phase 2: Google Books backfill (skip if --validate-only) ──────────

  if (validateOnly) {
    console.log('\nSkipping Google Books backfill (--validate-only)');
  }

  // Find entries where Open Library found nothing useful
  const needsBackfill = validateOnly ? [] : books.filter(b => {
    const entry = covers[b.id];
    return entry && !entry.coverUrl && !entry.isbn;
  });

  if (needsBackfill.length === 0 && !validateOnly) {
    console.log('\nNo books need Google Books backfill.');
  } else if (needsBackfill.length > 0) {
    console.log(`\n── Google Books backfill ──`);
    console.log(`${needsBackfill.length} books to look up\n`);

    let gFound = 0, gMissed = 0, gErrors = 0;

    for (let i = 0; i < needsBackfill.length; i++) {
      const book = needsBackfill[i];
      const progress = `[${i + 1}/${needsBackfill.length}]`;

      try {
        const result = await searchGoogleBooks(book.title, book.author);
        if (result && (result.coverUrl || result.isbn)) {
          covers[book.id] = {
            coverUrl: result.coverUrl,
            isbn: result.isbn,
            olid: null,
            description: result.description || null,
          };
          const status = result.coverUrl ? 'cover + ' : 'no cover, ';
          console.log(`${progress} ${book.title} -> ${status}isbn: ${result.isbn || 'none'}`);
          gFound++;
        } else {
          console.log(`${progress} ${book.title} -> not found`);
          gMissed++;
        }
      } catch (err) {
        console.warn(`${progress} ${book.title} -> ERROR: ${err.message}`);
        gErrors++;
      }

      if ((i + 1) % 50 === 0 || i === needsBackfill.length - 1) {
        writeFileSync(METADATA_PATH, JSON.stringify(covers, null, 2));
      }
      if (i < needsBackfill.length - 1) await sleep(REQUEST_DELAY);
    }

    console.log(`\nGoogle Books done — Found: ${gFound}, Missed: ${gMissed}, Errors: ${gErrors}`);
  }

  // ── Phase 3: Validate cover URLs ───────────────────────────────────────

  const toValidate = Object.entries(covers).filter(([, v]) => v.coverUrl);
  console.log(`\n── Validating ${toValidate.length} cover URLs ──\n`);

  let valid = 0, invalid = 0;
  for (let i = 0; i < toValidate.length; i++) {
    const [id, entry] = toValidate[i];
    const progress = `[${i + 1}/${toValidate.length}]`;

    const ok = await isValidCover(entry.coverUrl);
    if (ok) {
      valid++;
    } else {
      console.log(`${progress} ${id} -> removed (placeholder/broken: ${entry.coverUrl})`);
      covers[id] = { ...entry, coverUrl: null };
      invalid++;
    }

    if ((i + 1) % 50 === 0 || i === toValidate.length - 1) {
      writeFileSync(METADATA_PATH, JSON.stringify(covers, null, 2));
    }
    if (i < toValidate.length - 1) await sleep(REQUEST_DELAY);
  }

  console.log(`\nValidation done — Valid: ${valid}, Removed: ${invalid}`);

  // ── Phase 4: Fetch descriptions from Open Library Works API ────────────

  const needsDescription = Object.entries(covers).filter(
    ([, v]) => v.olid && !v.description
  );

  if (needsDescription.length === 0) {
    console.log('\nNo entries need description backfill.');
  } else {
    console.log(`\n── Description backfill (Open Library Works API) ──`);
    console.log(`${needsDescription.length} entries to look up\n`);

    let descFound = 0, descMissed = 0, descErrors = 0;

    for (let i = 0; i < needsDescription.length; i++) {
      const [id, entry] = needsDescription[i];
      const progress = `[${i + 1}/${needsDescription.length}]`;

      try {
        const olid = entry.olid.replace('/works/', '');
        const res = await fetch(`https://openlibrary.org/works/${olid}.json`, {
          headers: { 'User-Agent': USER_AGENT },
        });

        if (!res.ok) {
          console.warn(`${progress} ${id} -> HTTP ${res.status}`);
          descErrors++;
        } else {
          const work = await res.json();
          let desc = null;
          if (typeof work.description === 'string') {
            desc = work.description;
          } else if (work.description?.value) {
            desc = work.description.value;
          } else if (Array.isArray(work.first_sentence) && work.first_sentence.length > 0) {
            desc = work.first_sentence[0];
          } else if (work.first_sentence?.value) {
            desc = work.first_sentence.value;
          }

          if (desc) {
            covers[id] = { ...entry, description: desc };
            console.log(`${progress} ${id} -> description found`);
            descFound++;
          } else {
            console.log(`${progress} ${id} -> no description`);
            descMissed++;
          }
        }
      } catch (err) {
        console.warn(`${progress} ${id} -> ERROR: ${err.message}`);
        descErrors++;
      }

      if ((i + 1) % 50 === 0 || i === needsDescription.length - 1) {
        writeFileSync(METADATA_PATH, JSON.stringify(covers, null, 2));
      }
      if (i < needsDescription.length - 1) await sleep(REQUEST_DELAY);
    }

    console.log(`\nDescriptions done — Found: ${descFound}, Missed: ${descMissed}, Errors: ${descErrors}`);
  }

  // ── Summary ────────────────────────────────────────────────────────────

  writeFileSync(METADATA_PATH, JSON.stringify(covers, null, 2));
  const entries = Object.values(covers);
  const withCover = entries.filter(e => e.coverUrl);
  const withIsbn = entries.filter(e => e.isbn);
  const withDesc = entries.filter(e => e.description);
  console.log(`\nTotal: ${entries.length} entries — ${withCover.length} covers, ${withIsbn.length} ISBNs, ${withDesc.length} descriptions`);
  console.log(`Wrote to src/content/metadata.json`);
}

main();
