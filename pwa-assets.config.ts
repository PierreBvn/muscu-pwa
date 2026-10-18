import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...minimal2023Preset,
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: {
        background: '#0A0A0A',
        fit: 'contain',
      },
    },
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: {
        background: '#0A0A0A',
        fit: 'contain',
      },
    },
  },
  images: ['public/favicon.svg'],
});
