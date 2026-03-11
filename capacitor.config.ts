import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dinewise.mumbai',
  appName: 'DineWise Mumbai',
  webDir: 'dist',
  bundledWebRuntime: false,
  // If you use deep links later, this helps avoid mixed-content issues.
  server: {
    androidScheme: 'https'
  }
};

export default config;
