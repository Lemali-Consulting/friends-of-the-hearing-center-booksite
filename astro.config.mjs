import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://hearing-center-book-catalogue.netlify.app',
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
