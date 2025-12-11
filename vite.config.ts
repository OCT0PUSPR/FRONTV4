import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'resolve-dayjs-plugins',
      resolveId(id) {
        if (id.startsWith('dayjs/plugin/')) {
          // Resolve dayjs plugin imports
          const pluginName = id.replace('dayjs/plugin/', '')
          
          // Try regular plugin path first
          const regularPath = path.resolve(__dirname, 'node_modules/dayjs/plugin', `${pluginName}.js`)
          if (fs.existsSync(regularPath)) {
            return regularPath
          }
          
          // Try ESM plugin path (subdirectory structure)
          const esmPath = path.resolve(__dirname, 'node_modules/dayjs/esm/plugin', pluginName, 'index.js')
          if (fs.existsSync(esmPath)) {
            return esmPath
          }
          
          // Try ESM plugin as direct file
          const esmDirectPath = path.resolve(__dirname, 'node_modules/dayjs/esm/plugin', `${pluginName}.js`)
          if (fs.existsSync(esmDirectPath)) {
            return esmDirectPath
          }
          
          // For plugins that only have .d.ts files (like localeData), create a virtual module
          // that exports an empty function to prevent build errors
          if (pluginName === 'localeData') {
            return '\0virtual:dayjs-plugin-localeData'
          }
          
          // Fallback to regular path (let Vite handle the error if it doesn't exist)
          return regularPath
        }
        return null
      },
      load(id) {
        // Handle virtual module for localeData plugin
        if (id === '\0virtual:dayjs-plugin-localeData') {
          return 'export default function() { return {}; }'
        }
        return null
      },
    },
    {
      name: 'resolve-ant-design-icons-svg',
      enforce: 'pre',
      resolveId(id) {
        if (id.startsWith('@ant-design/icons-svg/')) {
          // Handle @ant-design/icons-svg imports from antd's nested dependencies
          const relativePath = id.replace('@ant-design/icons-svg/', '')
          
          // Try nested location first (antd/node_modules/@ant-design/icons-svg)
          const nestedPath = path.resolve(__dirname, 'node_modules/antd/node_modules/@ant-design/icons-svg', relativePath)
          if (fs.existsSync(nestedPath)) {
            return nestedPath
          }
          
          // Try nested with .js extension
          const nestedPathJs = path.resolve(__dirname, 'node_modules/antd/node_modules/@ant-design/icons-svg', `${relativePath}.js`)
          if (fs.existsSync(nestedPathJs)) {
            return nestedPathJs
          }
          
          // Try root node_modules (if installed at root level)
          const rootPath = path.resolve(__dirname, 'node_modules/@ant-design/icons-svg', relativePath)
          if (fs.existsSync(rootPath)) {
            return rootPath
          }
          
          // Try root with .js extension
          const rootPathJs = path.resolve(__dirname, 'node_modules/@ant-design/icons-svg', `${relativePath}.js`)
          if (fs.existsSync(rootPathJs)) {
            return rootPathJs
          }
          
          // If file doesn't exist, create a virtual module
          // This handles cases where @ant-design/icons-svg was removed but antd still references it
          return `\0virtual:ant-design-icons-svg-${relativePath.replace(/[/\\]/g, '-')}`
        }
        return null
      },
      load(id) {
        // Provide virtual modules for missing @ant-design/icons-svg files
        if (id.startsWith('\0virtual:ant-design-icons-svg-')) {
          // Return a minimal icon definition that matches @ant-design/icons-svg format
          // This prevents build errors when icons are missing but antd still references them
          return `export default {
  name: 'icon',
  theme: 'outlined',
  icon: function() { return null; }
};`
        }
        return null
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './@'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/data': path.resolve(__dirname, './src/data'),
      '@/stores': path.resolve(__dirname, './src/stores'),
      '@/components': path.resolve(__dirname, './src/components'),
    },
  },
  optimizeDeps: {
    include: ['framer-motion', 'lucide-react', '@mui/material', '@mui/icons-material', 'recharts', 'antd', 'dayjs', 'dayjs/plugin/localeData'],
  },
  build: {
    commonjsOptions: {
      include: [/framer-motion/, /@mui/, /recharts/, /antd/, /dayjs/, /node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
      external: [],
      onwarn(warning, warn) {
        // Suppress circular dependency warnings from node_modules
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
          return
        }
        warn(warning)
      },
    },
  },
  server: {
    host: '0.0.0.0', // Access from outside the container
    port: 5173,
    strictPort: false, // Strict mode
    watch: {
      usePolling: true, // Docker hot reload
    },
  },
})
