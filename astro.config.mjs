import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  // When building in GitHub Actions, set the correct site/base for
  // GitHub Pages. In local dev, base defaults to '/' so localhost works.
  site: 'https://lemali-consulting.github.io',
  base: process.env.GITHUB_ACTIONS ? '/friends-of-the-hearing-center-booksite' : '/',
  integrations: [react()],
  image: {
    // Allow remote image optimization for likely cover image hosts.
    // Add new domains here as Sarah adds cover image URLs.
    domains: [
      'books.google.com',
      'covers.openlibrary.org',
      'images-na.ssl-images-amazon.com',
      'm.media-amazon.com',
      'i.gr-assets.com',
      'drive.google.com',
      'lh3.googleusercontent.com',
    ],
  },
});
