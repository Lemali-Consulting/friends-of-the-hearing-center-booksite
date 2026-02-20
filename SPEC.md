# Friends of the Hearing Center — Book Collection Website Spec

## Overview

Friends of the Hearing Center is a nonprofit initiative affiliated with UPMC Children's Hospital Hearing Center in Pittsburgh. They maintain a curated list of 827+ books featuring Deaf, Hard of Hearing, and DeafBlind characters. The list is currently a Google Sheet that gets manually exported to a PDF a couple times a year.

**The goal:** A free, static website where families, teachers, therapists, and other professionals can browse and filter the book collection in a way that isn't overwhelming — and eventually read reviews written by kids who've read the books.

## Contacts

- **Sarah Grimm** — Teacher. Created and maintains the book list. Primary content updater.
- **Jessica Lampert** — Liaison. Handles branding, organizational coordination.

## Data Source

The canonical data lives in a Google Sheet:
`https://docs.google.com/spreadsheets/d/1kcqTRybN6kjPy45mhwmQLRz9g5kiXJMmPbpV8kKmcmQ/edit?gid=0#gid=0`

- Only the **Master List** tab is relevant; other tabs are internal reference.
- 827 books and growing (new books added monthly).
- Some records have incomplete data (highlighted cells = still researching).
- Age ranges are inconsistent and will need normalization.
- Sarah and one other person are the primary editors.

**Ideal workflow:** Sarah continues editing the Google Sheet. The site pulls from it automatically or via a simple export/sync process. She should not need to learn new tools.

## Core Features

### Book Catalog
- Card or list-based browsable view of all books
- Each book displays: title, author, book cover image, age range, book type, and key representation tags
- Clicking a book opens a detail view with full information

### Filtering & Sorting
- Filter by: age range, book type, representation type, equipment/technology, D/HH/DB author status
- Sort by: title, author, year
- Text search by title or author
- **Shareable filter URLs** — staff want to send links like "all picture books with hearing aids" directly to families

### Book Detail View
Should display all available fields from the sheet, including:
- Title, author, illustrator
- Book cover image (Sarah will provide cover photos or image URLs)
- Publication year
- Book type (picture book, chapter book, graphic novel, memoir, etc.)
- Age range
- Representation type (Deaf, Hard of Hearing, DeafBlind, ASL, Deaf Culture, etc.)
- Equipment/technology depicted (hearing aids, cochlear implants, etc.)
- Whether author/illustrator is D/HH/DB
- Purchase/find link (hold off for now — eventually Libby or Amazon, not Amazon-exclusive)

### Reviews (Phase 1 — Static)
- Reviews are written by children, facilitated by teachers, therapists, or parents
- Think "here's what one of our friends says about it" — not aggregate star ratings from the public
- Each review includes: reviewer name, star rating, text, and optionally a photo of the reviewer
- Reviews are **manually added** by staff (likely via updating the sheet or a simple form-to-data process)
- No public submission form in phase 1

### Reviews (Phase 2 — Future)
- Public-facing submission with **moderation/approval** before publishing
- Requires a backend — acknowledged as a separate future effort

## Design & Branding

- **Name:** "Friends of the Hearing Center" (may change — treat as placeholder)
- **Logo:** TBD. Jess is finalizing with her supervisor. Use a placeholder.
- **Colors:** Jess has brand color codes in Canva and will share them. Use sensible defaults until then.
- **Existing presence:** Facebook, Instagram, a Google Site (unofficial/off-brand)
- **UPMC branding:** Leaning toward *not* including UPMC's logo. The relationship exists but they want independence.
- **Credit:** Footer should include "Created by Lemali Consulting" at launch.

## Audience

Primary users, roughly in order of priority:
1. Parents of children treated at the Hearing Center
2. Teachers and Speech-Language Pathologists (SLPs)
3. Audiologists and Behavioral Health Psychologists (especially on cochlear implant teams)
4. Teen-age patients browsing independently
5. Anyone nationwide looking for D/HH/DB book representation

The site should be simple enough that a non-technical parent can browse on their phone, and useful enough that a therapist can quickly pull up a filtered list during a session.

## Technical Constraints

- **Must be free to host.** They're a nonprofit with no guaranteed ongoing funding. If funding disappears, the site must survive.
- **Static site preferred.** No server to maintain or pay for.
- **GitHub Pages** (or similar free static hosting) is the target.
- **Low maintenance.** Sarah is not a developer. The update workflow should feel like "edit the spreadsheet, and the site updates" — or as close to that as possible.
- **800+ books.** The UI needs to handle this volume without being overwhelming. Pagination or lazy loading may be necessary.

## Architecture

### Framework: Astro

The site should be built with [Astro](https://astro.build/). It's a strong fit for this project:

- **Static output by default.** Astro builds to plain HTML/CSS/JS — deploys directly to GitHub Pages with no server.
- **Content collections.** Astro's content layer provides a clean way to manage 800+ book entries with typed schemas and validation.
- **Island architecture.** The interactive catalog (search, filters) ships JS only where needed. Individual book detail pages can be pre-rendered as pure HTML — fast on any device and good for SEO/shareability.
- **Built-in image optimization.** Useful for handling 800+ book cover images without bloating the site.
- **GitHub Actions integration.** Straightforward to set up an automated build pipeline.

For the interactive filtering/search component on the catalog page, use whichever client-side approach you're comfortable with (React, Svelte, Vue, or vanilla JS) — Astro is framework-agnostic.

### Data Pipeline: Google Sheets → Astro

- **Google Sheets as CMS.** Use the Sheets API or a CSV export as a custom Astro content loader. A GitHub Action can pull the sheet data at build time, so Sarah just edits the spreadsheet and the site rebuilds.
- **Build trigger.** Either on a schedule (e.g., nightly) or via a manual "rebuild" button (GitHub Actions `workflow_dispatch`). The goal is Sarah never touches the codebase.

### Other Considerations

- **Client-side filtering.** With 800 books, client-side search/filter is feasible and avoids needing a backend. Load the full dataset as JSON on the catalog page.
- **URL query params for filters.** Enables shareable filtered views (e.g., `?age=Picture+Book&equipment=Hearing+Aid`).
- **Pre-rendered book pages.** Each book gets its own static page at build time (e.g., `/books/el-deafo`), good for direct linking and SEO.
- **Image handling.** Sarah will provide cover images. Consider hosting them in the repo with Astro's image optimization, or an external service if repo size becomes a concern.

## What's Not In Scope (For Now)

- Affiliate links (future consideration)
- Public review submission with moderation (phase 2)
- UPMC branding integration
- Domain name (TBD — GitHub Pages subdomain is fine for now)
