// @ts-check
import { defineConfig } from 'astro/config';

import tailwind from '@astrojs/tailwind';

import db from '@astrojs/db';

import node from '@astrojs/node';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), db(), react()],
  output: 'server',
  server: {
    host: "0.0.0.0"
  },
  adapter: node({
    mode: 'standalone'
  }),
});