import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ilyushinslava.primesuspect',
  appName: 'Prime Suspect',
  webDir: 'dist',
  server: {
    url: 'http://192.168.0.190:5173',
    cleartext: true
  }
};

export default config;