import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  // site and base will be set when deploying to GitHub Pages.
  // If using the GitHub Pages subdomain (no custom domain), set:
  //   site: 'https://lemali-consulting.github.io'
  //   base: '/friends-of-the-hearing-center-booksite'
  integrations: [react()],
});