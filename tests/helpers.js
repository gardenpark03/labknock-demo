// 시험 공통 도구. 시험은 로컬 Supabase(npx supabase start)에 연결하고, 시험마다 데모 데이터를 처음 상태로 되돌린다.
const { expect } = require('@playwright/test');
const path = require('path');

const API = process.env.LK_API_URL || 'http://127.0.0.1:54321';
const MAILPIT = process.env.LK_MAILPIT_URL || 'http://127.0.0.1:54324';
// 로컬 Supabase의 비밀 키는 저장소에 적지 않고, 켜져 있는 로컬 서버에서 읽어 온다 (배포 프로젝트의 키는 절대 쓰지 않는다)
const { execSync } = require('child_process');
let secretKey = process.env.LK_SECRET_KEY || '';
function localSecret() {
  if (!secretKey) {
    const env = execSync('npx -y supabase@2.122.1 status -o env', { cwd: path.join(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const m = /^SECRET_KEY="?([^"\n]+)"?$/m.exec(env);
    if (!m) throw new Error('로컬 Supabase가 켜져 있지 않아요. npx supabase@2.122.1 start 를 먼저 실행하세요.');
    secretKey = m[1];
  }
  return secretKey;
}
const SAMPLE_PDF = path.join(__dirname, '..', 'assets', 'samples', 'sample-cv.pdf');

/** 데모 데이터(공고·지원·인증 요청, 데모 계정 4개)를 처음 상태로 되돌린다. */
async function resetDemo() {
  const r = await fetch(`${API}/rest/v1/rpc/reset_demo`, { method: 'POST', headers: { apikey: localSecret(), Authorization: `Bearer ${localSecret()}`, 'Content-Type': 'application/json' }, body: '{}' });
  const body = await r.json();
  if (!body.ok) throw new Error(`reset_demo 실패: ${JSON.stringify(body)}`);
}

/** 서버에서 받아 화면을 다 그릴 때까지 기다린다. */
async function settle(page) {
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-rendering'));
}

/** 주소(#/…)로 열고 화면이 다 그려질 때까지 기다린다. */
async function open(page, hash = '#/') {
  await page.goto(`/index.html${hash}`);
  await page.waitForTimeout(50);   // 같은 문서 안 주소 이동(popstate)이 화면 갱신을 시작할 시간
  await settle(page);
  await expect(page.locator('#view')).not.toBeEmpty();
}

/** 로그인 화면의 발표용 데모 계정으로 로그인한다. role: '학생' | '연구실 관리자' | '관리자 신청자' | '운영 보조' */
async function loginAs(page, role) {
  await open(page, '#/login');
  await page.locator('.demo-account', { has: page.locator('.demo-account__role', { hasText: new RegExp(`^${role}$`) }) }).first().click();
  await expect(page).not.toHaveURL(/#\/login/);
  await settle(page);
  await expect(page.locator('#account-btn')).toBeVisible();
}

async function logout(page) {
  await settle(page);
  await page.click('#account-btn');
  await page.click('#logout');
  await expect(page.locator('#account-btn')).toHaveCount(0);
}

/** 확인창의 확인 버튼을 누른다. */
async function confirmDialog(page) {
  await expect(page.locator('#dialog')).toBeVisible();
  await page.click('#dialog-ok');
  await expect(page.locator('#dialog')).toBeHidden();
  await page.waitForTimeout(150);   // 확인 뒤 저장 요청(버튼 aria-busy)이 시작될 시간
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
  await settle(page);
}

/** 로컬 메일 수집기(Mailpit)에서 이 주소로 온 가장 최근 메일의 확인 링크를 찾는다. */
async function latestConfirmLink(email) {
  for (let i = 0; i < 20; i += 1) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
    const m = (list.messages || [])[0];
    if (m) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json();
      const href = /href="([^"]*token_hash=[^"]*)"/.exec(msg.HTML || '');
      if (href) return { subject: m.Subject, link: href[1].replace(/&amp;/g, '&') };
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${email}로 온 확인 메일이 없어요`);
}

/** 기본 양식 확인 메일과 같은 형식의 가입 확인 링크를 관리 API로 만든다 (로컬 전용). */
async function adminLink(email, password) {
  const r = await fetch(`${API}/auth/v1/admin/generate_link`, { method: 'POST', headers: { apikey: localSecret(), Authorization: `Bearer ${localSecret()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'signup', email, password, data: { role: 'student' }, redirect_to: 'http://127.0.0.1:4173/' }) });
  const body = await r.json();
  if (!body.action_link) throw new Error(`generate_link 실패: ${JSON.stringify(body)}`);
  return body.action_link;
}

// 브라우저에 공개되는 키 (js/config.js와 같은 로컬 값)
const PUBLISHABLE_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const DEMO = { student: 'student-a@g.skku.edu', admin: 'admin-a@skku.edu', applicant: 'admin-b@skku.edu', operator: 'ops@skku.edu' };

/** 화면을 거치지 않고 서버 함수(RPC)를 직접 부를 수 있게, 이 계정으로 로그인한 Supabase 클라이언트를 만든다. */
async function clientAs(email, password = 'labknock-demo-2026') {
  const { createClient } = require('@supabase/supabase-js');
  // 시험은 실시간 기능을 쓰지 않는다. Node 20(CI)에는 내장 WebSocket이 없어 클라이언트 생성이 실패하므로 빈 transport를 넘긴다
  const c = createClient(API, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: class {} } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email} 로그인 실패: ${error.message}`);
  return c;
}

/** 관리 API로 새 계정을 만든다 (로컬 전용). 가입과 같은 트리거(handle_new_user)로 프로필이 생긴다. */
async function createUser(email, { role = 'student', confirmed = true, password = 'labknock-test-pass' } = {}) {
  const r = await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: { apikey: localSecret(), Authorization: `Bearer ${localSecret()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, email_confirm: confirmed, user_metadata: { role } }) });
  const body = await r.json();
  if (!body.id) throw new Error(`계정 만들기 실패: ${JSON.stringify(body)}`);
  return { id: body.id, email, password };
}

/** 로그인 화면에서 이메일·비밀번호를 직접 입력해 로그인한다. */
async function loginWith(page, email, password, hash = '#/login') {
  await open(page, hash);
  await page.fill('#li-email', email);
  await page.fill('#li-password', password);
  await page.click('#li-submit');
  await expect(page.locator('#account-btn')).toBeVisible();
  await settle(page);
}

module.exports = { adminLink, open, settle, loginAs, loginWith, logout, confirmDialog, resetDemo, latestConfirmLink, clientAs, createUser, DEMO, PUBLISHABLE_KEY, SAMPLE_PDF, API };
