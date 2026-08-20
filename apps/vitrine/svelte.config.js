import adapterAuto from '@sveltejs/adapter-auto';
import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isVercel = process.env.VERCEL === '1';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: isVercel
      ? adapterAuto()
      : adapterNode({ out: 'build' }),
    alias: {
      $components: 'src/lib/components',
      $stores: 'src/lib/stores'
    }
  }
};

export default config;
