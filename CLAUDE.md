# Friends of the Hearing Center — Book Collection Website

## Project Overview

A static website for a nonprofit affiliated with UPMC Children's Hospital Hearing Center in Pittsburgh. It displays a curated catalog of 827+ books featuring Deaf, Hard of Hearing, and DeafBlind characters. The canonical data lives in a Google Sheet that is fetched at build time.

## Tech Stack

- **Framework:** [Astro](https://astro.build/) (static site generator)
- **UI integration:** React (via `@astrojs/react`)
- **Language:** JavaScript (ES modules), with Astro components (`.astro`)
- **Node version:** 22
- **Hosting:** GitHub Pages (deployed via GitHub Actions)

## Getting Started

```bash
# Install dependencies
npm install

# Fetch book data from Google Sheets and start the dev server
npm run fetch-books   # writes src/data/books.json
npm run dev           # starts Astro dev server on http://localhost:4321
```

The dev server runs on **port 4321**.

## Key Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Astro dev server (port 4321) |
| `npm run build` | Fetch books from Google Sheets + build static site to `dist/` |
| `npm run fetch-books` | Fetch book data only (writes `src/data/books.json`) |
| `npm run preview` | Preview the production build locally |

## Project Structure

```
src/
  components/
    BookCard.astro        # Card component used in the catalog grid
  data/
    books.js              # Sample/fallback book data (static)
    books.json            # Generated book data (fetched from Google Sheets)
  pages/
    index.astro           # Catalog page — grid of all books, sorted by author last name
    books/[id].astro      # Book detail page (pre-rendered per book)
  utils/
    url.js                # Exports `base` — normalized BASE_URL without trailing slash
scripts/
  fetch-books.js          # Fetches CSV from Google Sheets, parses it, writes books.json
public/
  favicon.svg
  favicon.ico
```

## Data Pipeline

1. `scripts/fetch-books.js` fetches a CSV export from Google Sheets
2. Parses rows using a custom CSV parser with column mapping (`COLUMN_MAP`)
3. Normalizes fields: book type, age range, representation types, author info
4. Generates a slug ID per book via `slugify(title)`
5. Writes the result to `src/data/books.json`
6. If the fetch fails and `books.json` already exists, the build uses the cached version

The Google Sheet ID is hardcoded in `scripts/fetch-books.js`.

## Deployment

- **CI/CD:** `.github/workflows/deploy.yml` builds and deploys to GitHub Pages
- **Triggers:** push to `main`, nightly cron (2am UTC), or manual `workflow_dispatch`
- **Base URL:** In CI (`GITHUB_ACTIONS` env var set), `base` is `/friends-of-the-hearing-center-booksite`. Locally it defaults to `/`.

## Architecture Notes

- All pages are **statically pre-rendered** at build time (Astro default)
- Book detail pages use `getStaticPaths()` to generate one page per book
- The `base` helper in `src/utils/url.js` normalizes `import.meta.env.BASE_URL` (strips trailing slash) for consistent link generation
- The catalog sorts books by author last name (last word of primary author)

## Dev Container

The project includes a `.devcontainer/` config for VS Code / Codespaces:
- Node 22 image with Git and GitHub CLI
- Installs Claude Code and OpenSpec globally
- Forwards port 4321
- Mounts `.ssh`, `.claude`, and `gh` config from the host
