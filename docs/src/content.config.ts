import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    // Astro's glob loader supports a custom base; docsLoader does not.
    // Keep the npm-linked Markdown canonical, and load the porting wrapper only.
    loader: glob({
      base: new URL('../', import.meta.url),
      // Keep raw GLSL references in the repository, but out of the site and search.
      pattern: ['*.{md,mdx}', 'guides/*.{md,mdx}', 'examples/*.{md,mdx}', 'agents/PORTING.mdx', '!glsl.md', '!guides/glsl.mdx'],
      generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
    }),
    schema: docsSchema(),
  }),
};
