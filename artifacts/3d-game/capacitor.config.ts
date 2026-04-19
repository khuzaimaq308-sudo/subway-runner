import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.replit.subwayrunner',
  appName: 'Subway Runner',
  webDir: 'dist/public',
  server: {
    url: 'https://character-dash.replit.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#060614',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
