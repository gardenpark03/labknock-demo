// 자동 시험 설정. 사이트는 정적 파일이라 python 내장 서버로 띄우고, 데이터는 로컬 Supabase(npx supabase start)를 쓴다.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                     // 시험이 같은 로컬 서버 데이터를 쓰므로 하나씩 돈다
  fullyParallel: false,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: 'chrome',            // 설치된 Chrome을 쓴다. Chrome이 없으면 이 줄을 지우고 `npx playwright install chromium`
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: !process.env.CI,
    stderr: 'ignore',            // python 서버 접속 기록은 숨긴다
  },
});
