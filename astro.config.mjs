// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import process from 'node:process';

const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), 'PUBLIC_');
const site = env.PUBLIC_SITE_URL ? new URL(env.PUBLIC_SITE_URL) : null;

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  security: {
    allowedDomains: [
      { hostname: 'localhost', protocol: 'http' },
      { hostname: '127.0.0.1', protocol: 'http' },
      ...(site ? [{ hostname: site.hostname, protocol: site.protocol.slice(0, -1), port: site.port }] : []),
    ],
  },
  vite: { plugins: [tailwindcss()] },
});
