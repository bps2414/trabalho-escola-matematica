const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 120000,
  reporter: 'list',
  use: {
    ...devices['Pixel 7'],
    video: { mode: 'on', size: { width: 412, height: 839 } },
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
  },
});
