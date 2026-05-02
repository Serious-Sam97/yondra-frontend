import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yondra.app',
  appName: 'Yondra',
  webDir: 'out',
  server: {
    url: 'https://yondra-thunder.vercel.app',
    cleartext: false,
  },
};

export default config;
