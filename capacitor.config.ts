import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cmsmanhattan.webmail',
  appName: 'webmail',
  webDir: 'dist/webmail/browser',
  server: {
    allowNavigation: ['*'],
    hostname: 'cmsmanhattan.com',
    androidScheme: 'http'
  }
};

export default config;
