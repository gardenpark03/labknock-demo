/* LabKnock · 머리글·주소 이동·권한 확인·시작
 * 주소(#/...)마다 화면을 고르고, 로그인·역할·이메일 확인 같은 접근 조건을 먼저 검사한다. */
'use strict';

let guard = null; // 미저장 입력 보호: { title, body }
let lastHash = location.hash || '#/';

function parseHash() {
  const raw = location.hash.slice(1) || '/';
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
// 다른 탭에서 데이터를 바꿨거나(예: 관리자 탭에서 심사) 이 탭으로 돌아오면 서버에서 최신 상태를 받아 다시 그린다
const canRefresh = () => {
  const pop = $('#account-pop');
  if (guard || $('#dialog').open || (pop && !pop.hidden) || document.querySelector('[aria-busy="true"]')) return false;
  // 검색어·로그인 정보처럼 저장 보호가 없는 입력도 입력하는 동안에는 다시 그려 지우지 않는다
  return !(document.activeElement && document.activeElement.matches('#view input:not([type="radio"]):not([type="checkbox"]), #view textarea'));
};
async function backgroundRefresh() {
  if (!canRefresh()) return;
  try { await syncState(); } catch { return; }
  if (!canRefresh()) return;
  // 다시 그려도 펼친 질문과 아직 적용하지 않은 검색어는 그대로 둔다
  const opened = $$('#view details[open]').map((d) => d.id).filter(Boolean);
  const typed = $$('#view input[type="text"], #view input[type="search"], #view input[type="email"], #view input:not([type])').filter((i) => i.id && i.value !== i.defaultValue).map((i) => [i.id, i.value]);
  bgRender = true;
  try { paint(); } finally { bgRender = false; }
  opened.forEach((id) => { const d = document.getElementById(id); if (d) d.open = true; });
  typed.forEach(([id, v]) => { const i = document.getElementById(id); if (i) i.value = v; });
}
if (channel) channel.addEventListener('message', backgroundRefresh);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') backgroundRefresh(); });

// ---------- 머리글 ----------
function navItems(u) {
  if (!u || u.role === 'student') return [['연구실 탐색', '#/labs', 'labs'], ...(u ? [['내 지원 현황', '#/my', 'my']] : [])];
  if (u.role === 'operator') return [['인증 요청 검토', '#/ops/verifications', 'ops']];
  return [['모집 공고', '#/admin/recruitments', 'rec'], ['지원자 관리', '#/admin/applicants', 'app']];
}
// 로그인 링크: 지금 화면이 허용된 복귀 목적지면 로그인 뒤 돌아오도록 넘긴다 (FR-07-13, 3.1.8)
function loginQuery() {
  const { parts, q } = parseHash();
  const next = ['login', 'signup'].includes(parts[0]) ? safeReturn(q.get('next') || '') : safeReturn(location.hash);
  return next ? `?next=${encodeURIComponent(next)}` : '';
}
// 바닥글 메뉴: 계정 역할에 맞는 바로 가기만 보여 준다 (권한 없는 화면으로 보내지 않는다)
function footerCols(u) {
  const cols = [['서비스', [['연구실 탐색', '#/labs'], ['학생 지원 방법', '#/?s=how'], ['자주 묻는 질문', '#/?s=faq']]]];
  if (!u) {
    cols.push(['학생', [['학생으로 가입', '#/signup?role=student'], ['로그인', `#/login${loginQuery()}`]]]);
    cols.push(['연구실', [['연구실 관리자 안내', '#/?s=lab'], ['관리자 신청자로 가입', '#/signup?role=admin']]]);
  } else if (u.role === 'student') {
    cols.push(['내 활동', [['내 지원 현황', '#/my'], ['내 정보', '#/account']]]);
    cols.push(['연구실', [['연구실 관리자 안내', '#/?s=lab']]]);
  } else if (u.role === 'operator') {
    cols.push(['운영', [['인증 요청 검토', '#/ops/verifications'], ['내 정보', '#/account']]]);
  } else {
    cols.push(['연구실', isApprovedAdmin(u)
      ? [['모집 공고 관리', '#/admin/recruitments'], ['지원자 관리', '#/admin/applicants'], ['연구실 소속 인증', '#/verification'], ['내 정보', '#/account']]
      : [['연구실 소속 인증', '#/verification'], ['내 정보', '#/account']]]);
  }
  return cols;
}
function renderFooter(u) {
  $('#reset').hidden = !(u && u.role === 'operator');
  $('#footer-nav').innerHTML = footerCols(u).map(([title, links], i) => `
    <div class="footer-col"><h2 class="footer-col__title" id="footer-col-${i}">${title}</h2>
      <ul aria-labelledby="footer-col-${i}">${links.map(([label, href]) => `<li><a href="${href}">${label}</a></li>`).join('')}</ul></div>`).join('');
}
function renderHeader(active, u) {
  $('#nav').innerHTML = navItems(u).map(([label, href, key]) => `<a href="${href}" ${key === active ? 'aria-current="page"' : ''}>${label}</a>`).join('');
  renderFooter(u);
  const box = $('#account');
  if (!u) {
    // 로그인·가입 화면에서는 이미 정해진 복귀 목적지를 그대로 넘긴다
    const nq = loginQuery();
    box.innerHTML = `<a class="lk-button lk-button--secondary small-btn" href="#/login${nq}">로그인</a><a class="lk-button small-btn signup-link" href="#/signup${nq}">회원가입</a>`;
    return;
  }
  const items = [
    ['#/account', '내 정보'],
    ...(!u.emailVerifiedAt ? [['#/account/email', '이메일 확인']] : []),
    ...(u.role === 'admin' ? [['#/verification', '연구실 소속 인증']] : []),
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
    await api.logout();
    go('#/', { replace: true });   // 로그아웃은 탐색 조건도 지운다 (FR-01-07.3)
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
let renderSeq = 0;
let renderStartedAt = 0;
// 서버에서 받는 동안 html에 data-rendering을 달아 둔다 (자동 시험이 화면이 다 그려질 때까지 기다리는 데 쓴다)
async function render() {
  const t = ++renderSeq;
  const startedAt = Date.now();
  const root = document.documentElement;
  root.setAttribute('data-rendering', '');
  // 서버 응답을 기다리는 동안 빈 화면이나 이전 화면만 남지 않게 '불러오는 중'을 보여 준다 (3.1.9·NFR-10 처리 중 구분).
  // 첫 진입은 바로, 이미 받은 뒤의 화면 이동은 0.4초 넘게 걸릴 때만 보여 깜박임을 줄인다.
  // 같은 화면을 다시 그릴 때(심사 처리 뒤 등)는 지금 내용을 그대로 두어 스크롤 위치가 바뀌지 않게 한다
  const samePath = parseHash().parts.join('/') === prevView.path;
  const view = $('#view');
  const showLoading = () => {
    if (t !== renderSeq) return;
    view.innerHTML = panelMsg('불러오고 있어요.', '잠시만 기다려 주세요.');
    view.setAttribute('aria-busy', 'true');
  };
  const slow = !loaded ? (showLoading(), null) : samePath ? null : setTimeout(showLoading, 400);
  const doneLoading = () => { clearTimeout(slow); if (t === renderSeq) view.removeAttribute('aria-busy'); };
  try { await syncState(); doneLoading(); } catch {
    doneLoading();
    if (t !== renderSeq) return;
    root.removeAttribute('data-rendering');
    if (!loaded) {
      $('#view').innerHTML = panelMsg('서버에 연결할 수 없어요.', '인터넷 연결을 확인한 뒤 다시 시도해주세요.', '<button class="lk-button" type="button" id="retry">다시 시도</button>');
      $('#retry').addEventListener('click', () => render());
      return;
    }
    toast('서버에 연결하지 못해 마지막으로 받은 내용을 보여 줘요.', true);
  }
  if (t !== renderSeq) return;
  renderStartedAt = startedAt;
  try { paint(); } finally { root.removeAttribute('data-rendering'); }
}
function paint() {
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
  // 홈: 안내 구역 바로 가기(#/?s=how 등)는 그 구역으로, 그 밖에는(로고를 다시 누른 경우 포함) 맨 위로 간다
  if ((parts[0] || 'home') === 'home' && parts.length <= 1) {
    const s = q.get('s') || '';
    const sec = /^(how|lab|faq)$/.test(s) ? document.getElementById(`home-${s}`) : null;
    if (sec) {
      // 뒤로 가기 때 브라우저의 스크롤 복원이 끝난 다음에 구역으로 옮긴다
      requestAnimationFrame(() => {
        if (!sec.isConnected) return;
        sec.scrollIntoView({ block: 'start' });
        const h2 = sec.querySelector('h2');
        if (h2) focusQuiet(h2);
      });
    } else {
      window.scrollTo(0, 0);
      const h1 = $('#view h1');
      if (prevView.path !== null && h1) focusQuiet(h1);
    }
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

const PROTECTED = ['apply', 'my', 'account', 'verification', 'admin', 'ops'];
const TITLES = { labs: '연구실 탐색', lab: '연구실 상세', apply: '지원서 작성', my: '내 지원 현황', login: '로그인', signup: '회원가입', account: '내 정보', email: '학교 이메일 확인', 'verify-email': '학교 이메일 확인', 'check-email': '학교 이메일 확인', verification: '연구실 소속 인증', recruitments: '모집 공고 관리', applicants: '지원자 관리', verifications: '인증 요청 검토' };

function renderView() {
  clearPageTimers();
  closeAccountMenu();
  lastHash = location.hash || '#/';
  if (!bgRender && toastAt < renderStartedAt) $('#toast').hidden = true;
  guard = null;
  const { parts, q } = parseHash();
  const view = $('#view');
  const page = parts[0] || 'home';
  const u = currentUser();

  // 로그인이 필요한 화면은 로그인 화면으로 보낸다. 로그인 뒤 허용된 목적지면 그곳으로,
  // 그 밖의 보호 화면이면 탐색으로 대체한다 (FR-07-13, 3.1.8). 판단은 로그인 화면이 한다
  if (PROTECTED.includes(page) && !u) {
    history.replaceState(null, '', `#/login?next=${encodeURIComponent(location.hash)}`);
    return renderView();
  }
  if ((page === 'login' || page === 'signup') && u) { history.replaceState(null, '', homeOf(u)); return renderView(); }
  if (page === 'admin' && !parts[1]) { history.replaceState(null, '', '#/admin/recruitments'); return renderView(); }
  if (u && PROTECTED.includes(page)) touch();

  const sub = parts[1];
  document.title = `${TITLES[page === 'admin' || page === 'ops' || (page === 'account' && sub) ? sub : page] || '랩노크'} · 랩노크`;
  switch (page) {
    case 'home':
      if (parts.length > 1) break;
      document.title = '랩노크 · 학부연구생 모집과 지원을 한 곳에서';
      renderHeader('home', u); return viewHome(view, q, u);
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
    case 'check-email': renderHeader('', u); return viewCheckEmail(view, q);
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
  const ok = await confirmDialog({ title: '데모 데이터를 초기화할까요?', body: '<p>모든 사용자에게 공고·지원·심사·인증 요청이 처음 상태로 돌아가요. 데모 계정 4개도 처음 상태가 돼요. 직접 가입한 계정은 남지만 그 계정의 지원과 인증 요청은 지워져요.</p>', ok: '초기화', danger: true });
  if (!ok) return;
  guard = null;
  const res = await busy($('#reset'), '초기화 중…', () => api.resetDemo());
  if (!res.ok) { toast(res.message, true); return; }
  go('#/', { replace: true });
  toast('데모 데이터를 처음 상태로 되돌렸어요.');
});

// 주소 없이 열면 홈 주소(#/)로 맞춰, 로고를 눌러도 같은 화면이 이력에 한 번 더 쌓이지 않게 한다
(async () => {
  const qs = new URLSearchParams(location.search);
  const tokenHash = qs.get('token_hash');
  // Supabase 기본 확인 메일은 확인을 끝낸 뒤 주소 뒤(#)에 로그인 토큰이나 오류를 붙여 돌려보낸다
  const hs = /^#(access_token|error)=/.test(location.hash) ? new URLSearchParams(location.hash.slice(1)) : null;
  if (tokenHash || hs) {
    $('#view').innerHTML = panelMsg('학교 이메일을 확인하고 있어요.', '잠시만 기다려주세요.');
    const res = tokenHash ? await api.verifyEmailLink(tokenHash)
      : hs.get('access_token') ? await api.acceptEmailSession(hs.get('access_token'), hs.get('refresh_token'))
        : { ok: false, code: 'expired' };
    // 확인 토큰이 주소창·방문 기록에 남지 않게 지운다
    history.replaceState(null, '', `${location.pathname}#/verify-email?result=${res.ok ? 'ok' : res.code}`);
  }
  if (!location.hash) history.replaceState(null, '', '#/');
  render();
})();
