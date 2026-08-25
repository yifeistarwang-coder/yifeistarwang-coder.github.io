import { defineConfig } from 'vite';
import { contentPlugin } from './scripts/content-plugin';

export default defineConfig({
  plugins: [contentPlugin()],
});
