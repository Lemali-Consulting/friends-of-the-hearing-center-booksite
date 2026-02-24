import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  // Update site/base when a custom domain is set up.
  // Until then, this targets the GitHub Pages subdomain URL.
  site: 'https://lemali-consulting.github.io',
  base: '/friends-of-the-hearing-center-booksite',
  integrations: [react()],
});