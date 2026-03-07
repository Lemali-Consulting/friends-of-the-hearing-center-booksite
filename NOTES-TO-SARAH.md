# Notes for Sarah — Google Sheet Data & Website Filters

Hi Sarah! The website reads several columns from the Google Sheet and uses them
to power the filter dropdowns on the catalog page. To keep the filters clean and
useful, here are a few things that would help.

---

## Representation column

### How it's parsed

1. The site splits each cell on **commas** to get individual tags.
2. Each tag is matched against a known list of abbreviations and labels.
3. Tags are classified as either **Representation** (shown in teal) or
   **Equipment/Technology** (shown in purple).

### What works well

Short, consistent abbreviations are ideal:

| In the sheet | Displayed as                    | Category       |
|--------------|---------------------------------|----------------|
| HA           | Hearing Aid                     | Equipment      |
| CI           | Cochlear Implant                | Equipment      |
| BAHA         | BAHA                            | Equipment      |
| FM           | FM System                       | Equipment      |
| ASL          | ASL                             | Representation |
| BSL          | British Sign Language           | Representation |
| DB           | DeafBlind                       | Representation |
| CODA         | CODA                            | Representation |
| DHH          | Deaf/Hard of Hearing            | Representation |
| HoH          | Hard of Hearing                 | Representation |
| TC           | Total Communication             | Representation |
| LSL          | Listening & Spoken Language     | Representation |
| AAC          | AAC                             | Representation |

Comma-separated lists like `HA, ASL` or `CI, Deaf Culture` work great.

### Things that cause issues

**Commas inside notes:** If a cell contains something like
`Assistive Tech (TTY, phones, etc.)`, the commas inside the parentheses get
treated as tag separators, producing broken fragments.
**Fix:** Use `Assistive Technology` or `Assistive Tech (TTY/phones)`.

**Slash-separated compound entries:** Entries like `ASL/HA` or `CI/HA` work
because the site splits them. But `BAHA/Treacher-Collins Syndrome` also gets
split. Using commas is more reliable: `BAHA, Treacher-Collins Syndrome`.

### Typos auto-corrected by the site

| In the sheet          | Corrected to      |
|-----------------------|-------------------|
| Signed Langauge       | Signed Language    |
| Signed Lanugage       | Signed Language    |
| Accomodations         | Accommodations     |
| Lip reading           | Lip Reading        |
| lipreading            | Lip Reading        |
| hearing loss          | Hearing Loss       |
| ASL?                  | ASL                |

### Duplicate labels auto-consolidated

| Variants in the sheet                        | Consolidated to       |
|----------------------------------------------|-----------------------|
| DHH, DHH Character, DHH Characters           | Deaf/Hard of Hearing  |
| Deaf, Deaf Character, Deaf Animal             | Deaf                  |
| Hard of Hearing Character                     | Hard of Hearing       |
| Various, Variety, Various Perspectives, etc.  | Various               |
| Guide Dog, Support Dog, Hearing Assistance Dog| Service Dog           |
| Acquired HL, Conductive HL, Progressive HL... | Hearing Loss          |

### All recognized abbreviations

`HA`, `CI`, `BAHA`, `FM`, `HAT`, `ASL`, `BSL`, `BASL`, `DB`, `CODA`, `DHH`,
`HoH`, `TC`, `LSL`, `AAC`, `PECS`, `ANSD`

Anything not in this list passes through as-is, which is fine for full labels
like `Deaf Culture`, `Meningitis`, or `Braille`. Just keep them consistent
across books!

---

## Book Type (from the Age Range column)

The first word/phrase before the parentheses in the "Age Range" column is used
as the book type: e.g., `Chapter (Gr 7-9)` becomes type "Chapter Book" with age
range "Gr 7-9".

### Auto-corrections

| In the sheet                    | Normalized to  |
|---------------------------------|----------------|
| Chater                          | Chapter Book   |
| Board Books                     | Board Book     |
| Pictures                        | Picture Book   |
| Chapter Book with Pictures      | Chapter Book   |
| *Augmented Reality Picture Book | Picture Book   |
| Comic                           | Graphic Novel  |
| Picture Book, Board Book        | Picture Book   |

### Clean values (no action needed)

Board Book, Picture Book, Chapter Book, Graphic Novel, Manga, Short Stories,
Activity Book, Children's

---

## Age Range

The raw age range from the sheet (e.g., `3-7 years`, `Gr 5-8`, `12+`) is
displayed as-is on book detail pages. For the **filter dropdown**, the site
converts it into broad age groups so users don't have to scroll through 100+
different formats.

### How age ranges map to filter groups

| Age Group        | Approximate ages | Example sheet values                    |
|------------------|------------------|-----------------------------------------|
| Baby & Toddler   | 0-2              | `0-4 years`, `Board` (with no age)      |
| Ages 3-5         | 3-5              | `3-5 years`, `age 3-5`, `Gr K-2`        |
| Ages 6-8         | 6-8              | `5-8 years`, `Gr 1-3`, `6-8 years`      |
| Ages 9-12        | 9-12             | `9-12 years`, `Gr 4-6`, `Older Elem.`   |
| Teen             | 13-18            | `Gr 7-12`, `High School`, `12+`         |
| Adult            | 19+              | `Adult`                                  |

A book whose range spans multiple groups (e.g., `3-8 years`) appears in all
matching groups (Ages 3-5 and Ages 6-8).

### Tips for consistency

- **Preferred format:** `3-7 years` or `Gr 3-7` (both work fine)
- **Avoid:** `age 3-7`, `ages 3-7`, `3-7 Years` (all work but are inconsistent)
- **Grade ranges:** `Gr K-3`, `Gr 5-8`, `Gr 9-12` are all recognized
- **`Nonfiction`** is not an age range and gets ignored by the age filter.
  Use a real age range instead if possible.

---

## Author Info column

The freeform "Author Info" text is displayed as-is on book detail pages. For the
**filter dropdown**, the site extracts keywords and maps them to broad
categories:

| Filter label | Matches keywords in the sheet                          |
|-------------|--------------------------------------------------------|
| D/HH        | DHH, Deaf, HoH, Hard of Hearing, hearing loss          |
| DeafBlind   | DB, DeafBlind, Usher                                   |
| CODA        | CODA, SODA                                             |
| Parent      | Parent, Mother, Father                                 |
| Family      | Grandparent, Sibling, Aunt, Cousin, Godparent, Spouse  |
| Educator    | TOD, TODHH, Teacher                                    |
| Professional| SLP, Audiologist, Therapist, Surgeon, Counselor         |
| Interpreter | Interpreter                                            |

A single entry can match multiple categories. For example,
`Parent and TOD, deaf illustrator` matches Parent, Educator, and D/HH.

### Tips

- Short labels like `DHH`, `Parent`, `TOD`, `CODA` are easiest
- Compound entries like `Author-DHH; Illustrator-DHH` work (the site finds
  "DHH" in the text)
- If the column is blank or `-`, the book won't appear under any author filter

---

## Duplicate book titles

Three books share a title with another book, which means only one shows up on
the site (the other is silently dropped):

- **Millie's Magical Ears** (appears twice)
- **Read My Lips** (appears twice)
- **Secrets of Camp Whatever 3-Book Series** (appears twice)

If these are genuinely different books, adding a small differentiator to the
title (e.g., year or author name) would fix this.

---

## Book covers and ISBNs

The site automatically fetches book cover images and ISBNs from
[Open Library](https://openlibrary.org/) and [Google Books](https://books.google.com/).
Results are stored in `src/content/covers.json` and displayed on the catalog and
detail pages.

### Current coverage

Out of 828 books:

- **316** have a cover image (194 from Open Library, 122 from Google Books)
- **458** have an ISBN
- **364** have neither — these are mostly self-published, very niche, or
  series/multi-book entries that don't match a single record in either database

### The "Cover Photo Link" column

The Google Sheet has a **"Cover Photo Link:"** column. If you paste a URL there,
it takes priority over the automatically fetched cover. This is the best way to
fill in covers for books the automated lookup missed.

Good sources for cover images:
- **Amazon** — right-click the cover on a book's page and copy image address
- **Goodreads** — same approach
- **Publisher websites** — often have high-res covers

Any direct image URL (ending in `.jpg`, `.png`, etc.) will work.

### Re-running the cover fetcher

If new books are added to the sheet, a developer can run:

```bash
npm run fetch-books       # pull latest book data from the sheet
npm run fetch-covers      # look up covers/ISBNs for any new books
```

The cover fetcher is incremental — it only queries books that aren't already in
`covers.json`, so re-runs are fast.
