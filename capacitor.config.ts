import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cmsmanhattan.webmail',
  appName: 'webmail',
  webDir: 'dist/webmail/browser',
  server: {
    allowNavigation: ['*'],
    hostname: 'cmsmanhattan.com',
    androidScheme: 'http'
  },
  plugins: {
    Filesystem: {
      enabled: true,
      path: 'downloadedFiles',
      android: {
        requestPermission: 'android.permission.READ_EXTERNAL_STORAGE',
        requestPermissionRationale: 'This app needs access to your storage to download files.'
      }
    }
  }
};

export default config;
