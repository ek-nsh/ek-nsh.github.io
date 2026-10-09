import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSidenotes from './src/plugins/rehype-sidenotes.mjs';

// Deployed to GitHub Pages from the repository ek-nsh/ek-nsh.github.io, a user site, so there is no `base`.
// (A project repo would need `base: '/<repo>'`; a custom domain would replace `site` and add public/CNAME.)
export default defineConfig({
  site: 'https://ek-nsh.github.io',
  devToolbar: { enabled: false },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      // Order matters: KaTeX renders math first, then footnotes are copied into the margin.
      rehypePlugins: [rehypeKatex, rehypeSidenotes],
    }),
  },
});
