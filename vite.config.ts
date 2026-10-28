import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import config from './site.config.json' with { type: 'json' };
import { validateSettings } from './src/lib/settings.ts';
import { publicConnection } from './src/lib/connection.ts';
import { readFileSync } from 'node:fs';

const site = validateSettings(config);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const connection = publicConnection(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  return {
    plugins: [react(), {
      name: 'site-configuration',
      transformIndexHtml(html) {
        return html.replaceAll('__SITE_TITLE__', escapeHtml(site.title))
          .replaceAll('__SITE_DESCRIPTION__', escapeHtml(site.description))
          .replaceAll('__SITE_COLOR__', site.primaryColor);
      },
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nDisallow: ${site.adminPath}\n` });
        this.emitFile({ type: 'asset', fileName: '.htaccess', source: readFileSync('hosting/apache.htaccess', 'utf8').replaceAll('__API_ORIGIN__', connection.url) });
      },
    }],
    build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 600 },
    server: { port: 5173 },
  };
});
