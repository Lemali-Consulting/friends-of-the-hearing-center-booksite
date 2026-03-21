/**
 * Migration script: reads src/content/books.json (already normalized)
 * and writes a CSV matching the new Google Sheet schema.
 *
 * Usage: node scripts/migrate-to-normalized-csv.js
 * Output: migration-output.csv
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOOKS_PATH = join(__dirname, '../src/content/books.json');
const OUT_PATH = join(__dirname, '../migration-output.csv');

const HEADERS = [
  'Title',
  'Author',
  'Illustrator',
  'Author Info',
  'Author Connection',
  'Cover Photo Link',
  'Book Type',
  'Age Range',
  'Age Groups',
  'Representation',
  'Equipment',
  'Main Character?',
  'Carnegie Library Link',
  'Series',
  'Series Number',
  'Tags',
  'Published In',
  'Purchase Link',
  'Summary',
];

/** Escape a value for CSV: quote if it contains commas, quotes, or newlines. */
function csvEscape(value) {
  if (value === null || value === undefined || value === '') return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function bookToRow(book) {
  return [
    book.title,
    book.author,
    book.illustrator,
    book.authorInfo,
    book.authorConnection.join(', '),
    book.coverImage,
    book.bookType,
    book.ageRange,
    book.ageGroups.join(', '),
    book.representationTypes.join(', '),
    book.equipment.join(', '),
    book.mainCharacter ? 'TRUE' : 'FALSE',
    '',
    '',
    '',
    '',
    book.publicationYear,
    book.purchaseLink,
    '',
  ].map(csvEscape).join(',');
}

const books = JSON.parse(readFileSync(BOOKS_PATH, 'utf-8'));
const lines = [HEADERS.map(csvEscape).join(','), ...books.map(bookToRow)];
writeFileSync(OUT_PATH, lines.join('\n') + '\n');
console.log(`Wrote ${books.length} books to ${OUT_PATH}`);
