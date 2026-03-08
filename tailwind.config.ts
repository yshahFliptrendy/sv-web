// Tailwind v4: theme is configured via @theme in globals.css
// This file is kept for tooling compatibility only.
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
}

export default config
