/* LabKnock · 머리글·주소 이동·권한 확인·시작
 * 주소(#/...)마다 화면을 고르고, 로그인·역할·이메일 확인 같은 접근 조건을 먼저 검사한다. */
'use strict';

let guard = null; // 미저장 입력 보호: { title, body }
let lastHash = location.hash || '#/labs';

function parseHash() {
  const raw = location.hash.slice(1) || '/labs';
  const [path, qs] = raw.split('?');
  return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs || ''), raw };
}
async function confirmLeave() {
  if (!guard) return true;
  const ok = await confirmDialog({ title: guard.title, body: guard.body, ok: '이동', cancel: '계속 작성' });
  if (ok) guard = null;
  return ok;
}
async function go(hash, { replace = false } = {}) {
  // 같은 화면을 다시 누르면 입력 중인 내용은 그대로 두고, 입력이 없으면 새로 그린다 (FR-05-11)
  if (hash === location.hash) { if (!guard) render(); return; }
  if (guard && !(await confirmLeave())) return;
  if (replace) history.replaceState(null, '', hash); else history.pushState(null, '', hash);
  render();
}
let skipPop = false;
window.addEventListener('popstate', async () => {
  if (skipPop) { skipPop = false; render(); return; }
  // 확인창이 열린 동안의 뒤로 가기는 무시하고 지금 화면에 머문다
  if ($('#dialog').open) { history.pushState(null, '', lastHash); return; }
  if (guard) {
    history.pushState(null, '', lastHash);
    if (!(await confirmLeave())) return;
    skipPop = true; history.back();   // 머물려고 넣은 기록 하나만 되돌려 원래 가려던 곳으로 간다
    return;
  }
  render();
});
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-skip]')) { e.preventDefault(); $('#view').focus(); return; }
  const pending = e.target.closest('a[aria-disabled="true"]');
  if (pending) { e.preventDefault(); return; }
  const a = e.target.closest('a[href^="#/"]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
  e.preventDefault();
  if (a.hasAttribute('data-consume-return') && S.session) { S.session.returnTo = null; save(); }
  closeAccountMenu();
  go(a.getAttribute('href'));
});
window.addEventListener('beforeunload', (e) => { if (guard) { e.preventDefault(); e.returnValue = ''; } });
// 다른 탭에서 데이터가 바뀌면(예: 관리자 탭에서 심사) 이 탭도 최신 상태로 다시 그린다
window.addEventListener('storage', (e) => {
  if (e.key !== STORE_KEY) return;
  S = load();
  const pop = $('#account-pop');
  if (guard || $('#dialog').open || (pop && !pop.hidden) || document.querySelector('[aria-busy="true"]')) return;
  bgRender = true;
  try { render(); } finally { bgRender = false; }
});

// ---------- 머리글 ----------
function navItems(u) {
  if (!u || u.role === 'student') return [['연구실 탐색', '#/labs', 'labs'], ...(u ? [['내 지원 현황', '#/my', 'my']] : [])];
  if (u.role === 'operator') return [['인증 요청 검토', '#/ops/verifications', 'ops']];
  return [['모집 공고', '#/admin/recruitments', 'rec'], ['지원자 관리', '#/admin/applicants', 'app']];
}
function renderHeader(active, u) {
  $('#nav').innerHTML = navItems(u).map(([label, href, key]) => `<a href="${href}" ${key === active ? 'aria-current="page"' : ''}>${label}</a>`).join('');
  $('[data-home]').setAttribute('href', homeOf(u));
  const box = $('#account');
  if (!u) {
    // 로그인·가입 화면에서는 이미 정해진 복귀 목적지를 그대로 넘긴다
    const { parts, q } = parseHash();
    const next = ['login', 'signup'].includes(parts[0]) ? safeReturn(q.get('next') || '') : safeReturn(location.hash);
    const nq = next ? `?next=${encodeURIComponent(next)}` : '';
    box.innerHTML = `<a class="lk-button lk-button--secondary small-btn" href="#/login${nq}">로그인</a><a class="lk-button small-btn signup-link" href="#/signup${nq}">회원가입</a>`;
    return;
  }
  const items = [
    ['#/account', '내 정보'],
    ...(!u.emailVerifiedAt ? [['#/account/email', '이메일 확인']] : []),
    ...(u.role === 'admin' ? [['#/verification', '연구실 소속 인증']] : []),
    ['#/mailbox', '가상 메일함'],
  ];
  box.innerHTML = `
    <div class="account-menu">
      <button type="button" class="account-btn" id="account-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="account-menu-list">
        <span class="account-btn__avatar" aria-hidden="true">${esc((u.name || u.email).slice(0, 1).toUpperCase())}</span>
        <span class="account-btn__text"><span class="account-btn__name">${esc(u.name || u.email)}</span><span class="account-btn__role">${roleLabel(u)}${u.emailVerifiedAt ? '' : ' · 이메일 미확인'}</span></span>
        <svg class="account-btn__chev" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="account-pop" id="account-pop" hidden>
        <p class="account-pop__who"><span class="strong">${esc(u.name || '이름 미입력')}</span><span class="lk-caption">${esc(u.email)}</span></p>
        <div class="account-pop__menu" id="account-menu-list" role="menu" aria-labelledby="account-btn">
          ${items.map(([href, label]) => `<a role="menuitem" href="${href}" ${active === href ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
          <button type="button" role="menuitem" id="logout">로그아웃</button>
        </div>
      </div>
    </div>`;
  const btn = $('#account-btn');
  const pop = $('#account-pop');
  const menuItems = () => $$('[role="menuitem"]', pop);
  btn.addEventListener('click', () => (pop.hidden ? openAccountMenu() : closeAccountMenu(true)));
  btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); openAccountMenu(); } });
  pop.addEventListener('keydown', (e) => {
    const list = menuItems(); const i = list.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); closeAccountMenu(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); list[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); list[list.length - 1].focus(); }
    else if (e.key === 'Tab') closeAccountMenu();
  });
  $('#logout').addEventListener('click', async () => {
    closeAccountMenu(true);
    if (!(await confirmLeave())) return;
    api.logout();
    go('#/labs', { replace: true });
    toast('로그아웃했어요.');
  });
}
function openAccountMenu() {
  const pop = $('#account-pop'); if (!pop) return;
  pop.hidden = false; $('#account-btn').setAttribute('aria-expanded', 'true');
  const first = $('[role="menuitem"]', pop); if (first) first.focus();
}
function closeAccountMenu(returnFocus = false) {
  const pop = $('#account-pop'); if (!pop || pop.hidden) return;
  pop.hidden = true; $('#account-btn').setAttribute('aria-expanded', 'false');
  if (returnFocus) $('#account-btn').focus();
}
document.addEventListener('click', (e) => { if (!e.target.closest('.account-menu')) closeAccountMenu(); });

// ---------- 화면 전환 ----------
// 화면이 바뀌면 맨 위로 올리고 제목에 포커스, 목록 선택만 바뀌면 상세 제목으로, 같은 화면이면 포커스를 되살린다
let prevView = { path: null, key: null };
function render() {
  const activeId = document.activeElement && document.activeElement.id;
  renderView();
  const { parts, q } = parseHash();
  const path = parts.join('/');
  const key = q.get('app') || q.get('rec') || q.get('req') || '';
  const focusQuiet = (el) => { el.tabIndex = -1; el.focus({ preventScroll: true }); };
  const restore = activeId && document.getElementById(activeId);
  if (bgRender) {
    if (restore && !restore.disabled) restore.focus({ preventScroll: true });
    prevView = { path, key };
    return;
  }
  if (path !== prevView.path) {
    window.scrollTo(0, 0);
    const h = $('#view h1');
    if (prevView.path !== null && h) focusQuiet(h);
  } else if (key !== prevView.key) {
    const d = $('#my-detail, #rv-detail, #rec-detail, #ops-detail');
    if (d) {
      if (window.innerWidth < 1024) d.scrollIntoView({ block: 'start' });
      const t = d.querySelector('h2');
      if (t) focusQuiet(t);
    }
  } else if (restore && !restore.disabled) {
    restore.focus({ preventScroll: true });
  } else {
    const t = $('#my-detail h2, #rv-detail h2, #rec-detail h2, #ops-detail h2') || $('#view h1');
    if (t) focusQuiet(t);
  }
  prevView = { path, key };
}

const PROTECTED = ['apply', 'my', 'account', 'verify-email', 'mailbox', 'verification', 'admin', 'ops'];
const TITLES = { labs: '연구실 탐색', lab: '연구실 상세', apply: '지원서 작성', my: '내 지원 현황', login: '로그인', signup: '회원가입', account: '내 정보', email: '학교 이메일 확인', 'verify-email': '학교 이메일 확인', mailbox: '가상 메일함', verification: '연구실 소속 인증', recruitments: '모집 공고 관리', applicants: '지원자 관리', verifications: '인증 요청 검토' };

function renderView() {
  clearPageTimers();
  closeAccountMenu();
  lastHash = location.hash || '#/labs';
  if (!bgRender) $('#toast').hidden = true;
  guard = null;
  const { parts, q } = parseHash();
  const view = $('#view');
  const page = parts[0] || 'labs';
  const u = currentUser();

  // 로그인이 필요한 화면은 로그인 화면으로 보내고, 끝나면 허용된 목적지로만 돌아온다 (FR-07-13)
  if (PROTECTED.includes(page) && !u) {
    const next = safeReturn(location.hash);
    history.replaceState(null, '', `#/login${next ? `?next=${encodeURIComponent(next)}` : ''}`);
    return renderView();
  }
  if ((page === 'login' || page === 'signup') && u) { history.replaceState(null, '', homeOf(u)); return renderView(); }
  if (page === 'admin' && !parts[1]) { history.replaceState(null, '', '#/admin/recruitments'); return renderView(); }
  if (u && PROTECTED.includes(page)) touch();

  const sub = parts[1];
  document.title = `${TITLES[page === 'admin' || page === 'ops' || (page === 'account' && sub) ? sub : page] || '랩노크'} · 랩노크`;
  switch (page) {
    case 'labs': renderHeader('labs', u); return viewLabs(view, q);
    case 'lab': renderHeader('labs', u); return viewDetail(view, parts[1], parts[2], q, u);
    case 'apply': renderHeader('labs', u); return u.role === 'student' ? viewApply(view, parts[1], u) : notAllowed(view, u);
    case 'my': renderHeader('my', u); return u.role === 'student' ? viewMy(view, q, u) : notAllowed(view, u);
    case 'login': renderHeader('', u); return viewLogin(view, q);
    case 'signup': renderHeader('', u); return viewSignup(view, q);
    case 'account':
      if (sub === 'email') { renderHeader('#/account/email', u); return viewEmail(view, q, u); }
      if (sub) break;
      renderHeader('#/account', u); return viewAccount(view, q, u);
    case 'verify-email': renderHeader('', u); return viewVerifyEmail(view, q, u);
    case 'mailbox': renderHeader('#/mailbox', u); return viewMailbox(view, u);
    case 'verification': renderHeader('#/verification', u); return isAdmin(u) ? viewVerification(view, u) : notAllowed(view, u);
    case 'admin':
      if (sub !== 'recruitments' && sub !== 'applicants') break;
      renderHeader(sub === 'recruitments' ? 'rec' : 'app', u);
      if (!isAdmin(u)) return notAllowed(view, u);
      if (!isApprovedAdmin(u)) return viewAdminGate(view, sub === 'recruitments' ? '모집 공고 관리' : '지원자 관리', u);
      return sub === 'recruitments' ? viewRecruit(view, q, u) : viewReview(view, q, u);
    case 'ops':
      if (sub !== 'verifications') break;
      renderHeader('ops', u); return u.role === 'operator' ? viewOps(view, q, u) : notAllowed(view, u);
    default: break;
  }
  renderHeader('', u);
  document.title = '페이지를 찾을 수 없어요 · 랩노크';
  return viewNotFound(view, u);
}

$('#reset').addEventListener('click', async () => {
  const ok = await confirmDialog({ title: '데모 데이터를 초기화할까요?', body: '<p>가입한 계정, 제출·심사·공고 변경, 인증 요청과 가상 메일이 모두 처음 상태로 돌아가요. 로그인도 풀려요.</p>', ok: '초기화', danger: true });
  if (!ok) return;
  guard = null;
  await resetAll();
  go('#/labs', { replace: true });
  toast('데모 데이터를 처음 상태로 되돌렸어요.');
});

render();
