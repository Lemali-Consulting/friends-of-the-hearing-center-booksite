import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  // When building in GitHub Actions, set the correct site/base for
  // GitHub Pages. In local dev, base defaults to '/' so localhost works.
  site: 'https://lemali-consulting.github.io',
  base: process.env.GITHUB_ACTIONS ? '/friends-of-the-hearing-center-booksite' : '/',
  integrations: [react()],
});