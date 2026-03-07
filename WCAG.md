# WCAG Compliance Audit

Audited: 2026-03-07

## Critical (WCAG 2.1 A)

### 1. Missing labels for form controls
- **Location:** `src/components/BookCatalog.tsx:162-196`
- **Issue:** Search input and all 6 `<select>` dropdowns have no `<label>` or `aria-label`. Screen readers cannot identify these controls.
- **Criterion:** 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value
- **Status:** Fixed

### 2. No skip navigation link
- **Location:** `src/layouts/Layout.astro`
- **Issue:** No "Skip to main content" link. Keyboard users must tab through header and filters to reach content.
- **Criterion:** 2.4.1 Bypass Blocks
- **Status:** Fixed

### 3. Insufficient color contrast
- **Location:** Multiple files
- **Issue:** Several text/background combinations fail AA 4.5:1 ratio:
  - `#9ca3af` on `#f9fafb` (~2.7:1) — dt labels, subtitle, cover placeholder text
  - `#9ca3af` on `#fff` (~2.9:1) — illustrator text, footer text
  - `#6b7280` on `#fff` (~4.6:1) — author text, back link (borderline)
- **Criterion:** 1.4.3 Contrast (Minimum)
- **Status:** Fixed

### 4. No visible focus indicators on book card links
- **Location:** `src/pages/index.astro` (global styles for `.book-card`)
- **Issue:** Only `:hover` styles defined, no `:focus` or `:focus-visible`. Keyboard users cannot see which card is focused.
- **Criterion:** 2.4.7 Focus Visible
- **Status:** Fixed

## Significant (WCAG 2.1 AA)

### 5. Cover placeholder not marked decorative
- **Location:** `src/components/BookCatalog.tsx:217`
- **Issue:** Placeholder div shows a single letter but is not `aria-hidden`. Redundant with card title.
- **Criterion:** 1.1.1 Non-text Content
- **Status:** Fixed

### 6. No live region for filter results
- **Location:** `src/components/BookCatalog.tsx:205-209`
- **Issue:** Result count updates when filters change but is not in an `aria-live` region. Screen reader users are not informed.
- **Criterion:** 4.1.3 Status Messages
- **Status:** Fixed

### 7. Missing page description meta tag
- **Location:** `src/layouts/Layout.astro:13-19`
- **Issue:** No `<meta name="description">`. Affects screen reader page summaries and SEO.
- **Criterion:** Best practice (not a strict WCAG failure)
- **Status:** Fixed

## Minor (WCAG AAA / Best Practice)

### 8. Infinite scroll with no keyboard alternative
- **Location:** `src/components/BookCatalog.tsx:132-146`
- **Issue:** IntersectionObserver-based loading has no button fallback. Keyboard/screen reader users may not trigger it.
- **Criterion:** 2.1.1 Keyboard
- **Status:** Fixed — added "Show more books" button alongside the IntersectionObserver sentinel

### 9. `user-select: none` on placeholders
- **Location:** `src/pages/index.astro:141`, `src/pages/books/[id].astro:243`
- **Issue:** Can interfere with assistive technology text selection.
- **Criterion:** Best practice
- **Status:** Fixed — removed `user-select: none`

### 10. Favicon links missing base prefix
- **Location:** `src/layouts/Layout.astro:15-16`
- **Issue:** `/favicon.svg` and `/favicon.ico` don't use `base` helper; 404 on GitHub Pages.
- **Criterion:** Not WCAG, but affects usability
- **Status:** Fixed — favicon hrefs now use `${base}/` prefix
