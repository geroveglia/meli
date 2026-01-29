/* tailwind.config.ts */

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/pages/**/*.{js,ts,jsx,tsx,mdx}', './src/components/**/*.{js,ts,jsx,tsx,mdx}', './src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--accent-1)',
        secondary: 'var(--accent-2)',
        tertiary: 'var(--accent-3)',
        'accent-1': 'var(--accent-4)',
        'accent-2': 'var(--accent-5)',
        'accent-3': 'var(--accent-6)',
        'accent-4': 'var(--accent-7)',
        'accent-5': 'var(--accent-8)',
        'accent-6': 'var(--accent-9)',
        'accent-7': 'var(--accent-10)',
      },
    },
  },
};
export default config;