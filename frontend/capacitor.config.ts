import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.faustino.mev2',
  appName: 'Me v2',
  webDir: 'build',
  server: {
    url: 'https://game-of-life-roan-sigma.vercel.app'
  }
};

export default config;
