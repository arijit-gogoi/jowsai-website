// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Cormorant Garamond',
      cssVariable: '--font-display',
      weights: [400, 600],
      styles: ['normal', 'italic'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Jost',
      cssVariable: '--font-text',
      weights: [400, 500],
      styles: ['normal'],
      fallbacks: ['sans-serif'],
    },
  ],
});
