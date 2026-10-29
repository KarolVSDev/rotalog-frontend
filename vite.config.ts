import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv } from 'vite'
import { validateEnvironment } from './src/shared/api/environment.ts'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  validateEnvironment(loadEnv(mode, process.cwd(), 'VITE_'), command === 'build');
  return {
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  };
})
