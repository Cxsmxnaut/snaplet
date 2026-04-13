import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, __dirname, '');
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '');

  const supabaseUrl =
    localEnv.VITE_SUPABASE_URL ||
    localEnv.NEXT_PUBLIC_SUPABASE_URL ||
    rootEnv.VITE_SUPABASE_URL ||
    rootEnv.NEXT_PUBLIC_SUPABASE_URL ||
    '';

  const supabaseAnonKey =
    localEnv.VITE_SUPABASE_ANON_KEY ||
    localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    rootEnv.VITE_SUPABASE_ANON_KEY ||
    rootEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  const apiBaseUrl =
    localEnv.VITE_API_BASE_URL ||
    rootEnv.VITE_API_BASE_URL ||
    '';

  const proxyTarget =
    localEnv.VITE_PROXY_TARGET ||
    rootEnv.VITE_PROXY_TARGET ||
    process.env.VITE_PROXY_TARGET ||
    apiBaseUrl ||
    'http://localhost:3000';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
