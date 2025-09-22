import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
  plugins: [
    react({
      // Enable React Fast Refresh for better development experience
      fastRefresh: true,
      // Optimize JSX runtime
      jsxRuntime: 'automatic',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/store': path.resolve(__dirname, './src/store'),
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Enhanced code splitting for better performance
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('framer-motion')) {
              return 'animations';
            }
            if (id.includes('axios')) {
              return 'http';
            }
            if (id.includes('date-fns')) {
              return 'utils';
            }
            if (id.includes('zustand')) {
              return 'state';
            }
            if (id.includes('@heroicons')) {
              return 'icons';
            }
            return 'vendor';
          }
          
          // App chunks
          if (id.includes('/components/')) {
            if (id.includes('ChickenRace') || id.includes('Tooltip')) {
              return 'race-components';
            }
            if (id.includes('DetailedRanking')) {
              return 'ranking-components';
            }
            if (id.includes('Sidebar') || id.includes('LeaderboardSelector')) {
              return 'ui-components';
            }
            return 'components';
          }
          
          if (id.includes('/hooks/')) {
            return 'hooks';
          }
          
          if (id.includes('/services/')) {
            return 'services';
          }
          
          if (id.includes('/store/')) {
            return 'store';
          }
        },
        // Optimize asset naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext || '')) {
            return `assets/styles/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Enable minification
    minify: 'esbuild',
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand',
      'axios',
      'date-fns',
    ],
    exclude: ['@heroicons/react'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    // Explicitly define environment variables for production builds
    'import.meta.env.VITE_FUNIFIER_SERVER_URL': JSON.stringify(env.VITE_FUNIFIER_SERVER_URL),
    'import.meta.env.VITE_FUNIFIER_API_KEY': JSON.stringify(env.VITE_FUNIFIER_API_KEY),
    'import.meta.env.VITE_FUNIFIER_AUTH_TOKEN': JSON.stringify(env.VITE_FUNIFIER_AUTH_TOKEN),
  },
  // Development server optimizations
  server: {
    hmr: {
      overlay: false,
    },
  },
  };
});