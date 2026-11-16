/* LabKnock 발표용 클릭 프로토타입 (SRS v1.3 UI-01~06)
 * 서버·DB 없이 브라우저 메모리(sessionStorage)에서 상태 전환만 흉내 낸다. 모든 데이터는 가상이다. */
'use strict';

// ---------- 공통 도구 ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (iso) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '');
const fmtDateTime = (iso) => { const d = new Date(iso); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const nowIso = () => new Date().toISOString();
const chars = (s) => [...(s || '').normalize('NFC')].length;
const norm = (s) => (s || '').normalize('NFC').replace(/\s+/gu, '').toLowerCase();
const fmtSize = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

// ---------- 가상 데이터 ----------
function seed() {
  const t = (d, h = '09:00:00') => new Date(`${d}T${h}+09:00`).toISOString();
  return {
    role: 'visitor',
    seq: 102,
    labs: {
      L1: { name: '지능형시스템 연구실', professor: '김가상', fields: ['인공지능', '데이터 분석'], intro: '학습 기반 지능형 시스템과 모델 평가 방법을 연구합니다.' },
      L2: { name: '컴퓨팅시스템 연구실', professor: '이가상', fields: ['시스템', '운영체제'], intro: '운영체제와 시스템 소프트웨어의 성능·안정성을 연구합니다.' },
      L3: { name: '소프트웨어공학 연구실', professor: '박가상', fields: ['소프트웨어공학'], intro: '요구공학과 테스트 자동화를 연구합니다.' },
      L4: { name: '정보보호 연구실', professor: '최가상', fields: ['보안', '네트워크'], intro: '소프트웨어 취약점 분석과 네트워크 보안을 연구합니다.' },
      L5: { name: '인간컴퓨터상호작용 연구실', professor: '정가상', fields: ['HCI', '데이터 분석'], intro: '사용자 경험과 인터랙션 설계를 연구합니다.' },
      L6: { name: '데이터베이스 연구실', professor: '한가상', fields: ['데이터베이스', '데이터 분석'], intro: '대규모 데이터 저장·질의 처리 기술을 연구합니다.' },
    },
    recs: {
      R1: { lab: 'L1', title: '2026 겨울 학부연구생 모집', topic: '지능형 시스템 실험 및 모델 성능 비교', activity: '주 1회 연구 미팅 · 실험 결과 공유', skills: 'Python 기초와 협업 경험', capacity: 2, start: '2026-11-10', end: '2026-11-30', published: true, earlyClosedAt: null, savedAt: t('2026-11-09', '14:30:00'), log: [['초안 저장', t('2026-11-08', '16:20:00')], ['게시', t('2026-11-09', '14:30:00'), '모집기간 2026.11.10 – 2026.11.30 · 2명']] },
      R2: { lab: 'L2', title: '시스템 소프트웨어 학부연구생', topic: '리눅스 커널 스케줄러 성능 분석', activity: '격주 세미나 · 실험 환경 구축 참여', skills: 'C 기초', capacity: 1, start: '2026-11-05', end: '2026-11-28', published: true, earlyClosedAt: null, savedAt: t('2026-11-04') },
      R3: { lab: 'L3', title: '테스트 자동화 연구 참여', topic: '테스트 케이스 자동 생성 도구 평가', activity: '주 1회 미팅 · 도구 실험', skills: 'Java 또는 Python', capacity: 2, start: '2026-12-01', end: '2026-12-14', published: true, earlyClosedAt: null, savedAt: t('2026-11-15') },
      R4: { lab: 'L4', title: '보안 취약점 분석 학부연구생', topic: '오픈소스 취약점 재현과 분석', activity: '주 2회 스터디', skills: '리눅스 사용 경험', capacity: 1, start: '2026-10-01', end: '2026-11-08', published: true, earlyClosedAt: null, savedAt: t('2026-09-28') },
      R5: { lab: 'L5', title: 'HCI 사용자 연구 보조', topic: '모바일 앱 사용성 평가', activity: '사용자 인터뷰 · 데이터 정리', skills: '', capacity: 3, start: '2026-11-12', end: '2026-11-29', published: true, earlyClosedAt: null, savedAt: t('2026-11-11') },
      R6: { lab: 'L1', title: '2027 봄 학부연구생 모집', topic: '', activity: '', skills: '', capacity: '', start: '', end: '', published: false, earlyClosedAt: null, savedAt: t('2026-11-14', '10:12:40'), log: [['초안 저장', t('2026-11-14', '10:12:40')]] },
      R7: { lab: 'L6', title: '데이터 시스템 학부연구생', topic: '질의 최적화 실험', activity: '주 1회 미팅', skills: 'SQL 기초', capacity: 2, start: '2026-11-01', end: '2026-12-05', published: true, earlyClosedAt: null, savedAt: t('2026-10-30') },
    },
    apps: {
      A0097: { id: 'A-0097', rec: 'R1', student: '가상 학생 E', email: 'student-e@g.skku.edu', dept: '소프트웨어학과', year: 4, sample: true, mine: false, intro: '데이터 분석 동아리에서 시각화 프로젝트를 진행했습니다.', course: '석사', files: ['CV.pdf'], submittedAt: t('2026-11-11', '10:20:00'), history: [['지원 완료', t('2026-11-11', '10:20:00')], ['검토 중', t('2026-11-12', '09:10:00')], ['합격', t('2026-11-14', '16:00:00')]] },
      A0098: { id: 'A-0098', rec: 'R1', student: '가상 학생 B', email: 'student-b@g.skku.edu', dept: '소프트웨어학과', year: 3, sample: true, mine: false, intro: '머신러닝 수업 프로젝트로 이미지 분류 모델을 만들었습니다.', course: '학석연계', files: ['CV.pdf', '성적증명서.pdf'], submittedAt: t('2026-11-12', '13:05:00'), history: [['지원 완료', t('2026-11-12', '13:05:00')], ['검토 중', t('2026-11-13', '11:00:00')]] },
      A0099: { id: 'A-0099', rec: 'R1', student: '가상 학생 C', email: 'student-c@g.skku.edu', dept: '소프트웨어학과', year: 2, sample: true, mine: false, intro: '파이썬으로 실험 자동화 스크립트를 작성한 경험이 있습니다.', course: '미정', files: ['CV.pdf'], submittedAt: t('2026-11-13', '18:40:00'), history: [['지원 완료', t('2026-11-13', '18:40:00')], ['검토 중', t('2026-11-14', '10:00:00')], ['면담', t('2026-11-15', '15:20:00')]] },
      A0100: { id: 'A-0100', rec: 'R1', student: '가상 학생 D', email: 'student-d@g.skku.edu', dept: '소프트웨어학과', year: 3, sample: true, mine: false, intro: '', course: '', files: [], submittedAt: t('2026-11-14', '09:30:00'), history: [['지원 완료', t('2026-11-14', '09:30:00')], ['철회', t('2026-11-15', '08:10:00')]] },
      A0102: { id: 'A-0102', rec: 'R2', student: '가상 학생', email: 'student-a@g.skku.edu', dept: '소프트웨어학과', year: 3, sample: true, mine: true, intro: '운영체제 수업에서 스케줄러 과제를 구현하며 시스템 소프트웨어에 관심을 갖게 되었습니다.', course: '석사', files: ['CV.pdf'], submittedAt: t('2026-11-15', '21:00:00'), history: [['지원 완료', t('2026-11-15', '21:00:00')], ['검토 중', t('2026-11-16', '09:30:00')]] },
    },
  };
}

const KEY = 'labknock-demo-v3';
let S;
try { S = JSON.parse(sessionStorage.getItem(KEY)) || seed(); } catch { S = seed(); }
const blobs = {}; // 이번 세션에서 실제로 고른 PDF (새로고침 시 사라짐)
const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 저장 불가 환경 */ } };

const ME = { name: '가상 학생', dept: '소프트웨어학과', year: 3, email: 'student-a@g.skku.edu' };
const ADMIN_LAB = 'L1';

// ---------- 업무 규칙 (SRS 부록 B) ----------
function recStatus(r) {
  if (!r.published) return '작성 중';
  if (r.earlyClosedAt) return '마감';
  const now = new Date();
  const start = new Date(`${r.start}T00:00:00+09:00`);
  const endBoundary = new Date(new Date(`${r.end}T00:00:00+09:00`).getTime() + 864e5);
  if (now >= endBoundary) return '마감';
  if (now < start) return '모집 예정';
  return '모집 중';
}
const appStatus = (a) => a.history[a.history.length - 1][0];
const NEXT = { '지원 완료': ['검토 중'], '검토 중': ['면담', '합격', '불합격'], '면담': ['합격', '불합격'] };
const TERMINAL = ['합격', '불합격', '철회'];
const badgeClass = (s) => ({ '작성 중': 'neutral', '마감': 'neutral', '불합격': 'neutral', '철회': 'neutral', '면담': 'warning', '승인 대기': 'warning', '합격': 'success' }[s] || '');
const badge = (s) => `<span class="lk-badge ${badgeClass(s) ? 'lk-badge--' + badgeClass(s) : ''}">${esc(s)}</span>`;
const period = (r) => (r.start ? `${fmtDate(r.start)} – ${fmtDate(r.end)}` : '미정');
const myAppFor = (recId) => Object.values(S.apps).find((a) => a.mine && a.rec === recId);
const appsOf = (recId) => Object.values(S.apps).filter((a) => a.rec === recId);
const passedCount = (recId) => appsOf(recId).filter((a) => appStatus(a) === '합격').length;
const STATUS_ORDER = { '모집 중': 0, '모집 예정': 1, '마감': 2 };
// 지원 현황의 상태 의미 (SRS 2.6: 상태 의미가 사용자 도움말 역할)
const STATUS_NOTE = {
  '지원 완료': '제출이 완료됐어요. 연구실이 검토를 시작하면 상태가 바뀌어요.',
  '검토 중': '연구실이 지원서를 검토하고 있어요.',
  '면담': '연구실이 면담 단계로 진행했어요.',
  '합격': '최종 합격했어요.',
  '불합격': '이번 모집에는 합격하지 못했어요.',
  '철회': '지원을 철회했어요. 제출 내용은 읽기 전용으로 남고 같은 공고에 다시 지원할 수 없어요.',
};
function dday(r) {
  const today = new Date(`${todayIso()}T00:00:00+09:00`);
  const end = new Date(`${r.end}T00:00:00+09:00`);
  const d = Math.round((end - today) / 864e5);
  return d <= 0 ? '오늘 마감' : `D-${d}`;
}
function stepper(a) {
  const hist = a.history.map(([st]) => st);
  const s = appStatus(a);
  const withdrawn = s === '철회';   // 철회는 종료 상태 (B.2)
  const result = hist.find((x) => x === '합격' || x === '불합격');
  const current = { '지원 완료': 0, '검토 중': 1, '면담': 2, '합격': 3, '불합격': 3, '철회': 3 }[s];
  const steps = [
    ['지원 완료', hist.includes('지원 완료'), ''],
    ['검토 중', hist.includes('검토 중'), ''],
    ['면담', hist.includes('면담'), hist.includes('면담') || withdrawn ? '' : result ? '생략' : '해당 시'],
    withdrawn ? ['철회', true, '지원 종료'] : ['최종 결과', !!result, result || ''],
  ];
  return `<ol class="stepper" aria-label="진행 단계">${steps.map(([label, reached, sub], i) => {
    const cls = i === current ? (withdrawn ? 'is-ended' : 'is-current') : reached ? 'is-done' : '';
    const sr = i === current ? (withdrawn ? '종료' : '현재 단계') : reached ? '완료' : '아직 아님';
    return `<li class="stepper__item ${cls}"><span class="stepper__bar"></span><span class="stepper__label">${label}</span>${sub ? `<span class="stepper__sub">${sub}</span>` : ''}<span class="sr-only">${sr}</span></li>`;
  }).join('')}</ol>`;
}

// ---------- 라우팅 ----------
function parseHash() {
  const raw = location.hash.slice(1) || '/labs';
  const [path, qs] = raw.split('?');
  return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs || ''), raw };
}
let guard = null; // 미저장 입력 보호: { title, body }
let lastHash = location.hash || '#/labs';

async function go(hash, { replace = false } = {}) {
  // 같은 화면을 다시 누르면 입력 중인 내용은 그대로 두고, 입력이 없으면 새로 그린다 (FR-05-11)
  if (hash === location.hash) { if (!guard) render(); return; }
  if (guard) {
    const ok = await confirmDialog({ title: guard.title, body: guard.body, ok: '이동', cancel: '계속 작성', focusCancel: true });
    if (!ok) return;
    guard = null;
  }
  if (replace) history.replaceState(null, '', hash); else history.pushState(null, '', hash);
  render();
}
window.addEventListener('popstate', async () => {
  if (guard) {
    const target = location.hash;
    history.pushState(null, '', lastHash);
    const ok = await confirmDialog({ title: guard.title, body: guard.body, ok: '이동', cancel: '계속 작성', focusCancel: true });
    if (!ok) return;
    guard = null;
    history.replaceState(null, '', target);
  }
  render();
});
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-skip]')) { e.preventDefault(); $('#view').focus(); return; }
  const a = e.target.closest('a[href^="#/"]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  go(a.getAttribute('href'));
});
window.addEventListener('beforeunload', (e) => { if (guard) { e.preventDefault(); e.returnValue = ''; } });

// ---------- 확인창·알림 ----------
// 되돌릴 수 없는 동작을 확인하므로 첫 포커스는 취소 버튼에 둔다 (SRS 3.1.9)
function confirmDialog({ title, body, ok = '확인', cancel = '취소', danger = false, focusCancel = true, alertOnly = false }) {
  const dlg = $('#dialog');
  $('#dialog-title').textContent = title;
  $('#dialog-body').innerHTML = body;
  const okBtn = $('#dialog-ok');
  const cancelBtn = $('#dialog-cancel');
  okBtn.textContent = ok;
  cancelBtn.textContent = cancel;
  cancelBtn.hidden = alertOnly;
  okBtn.className = `lk-button${danger ? ' lk-button--danger' : ''}`;
  const opener = document.activeElement;
  return new Promise((resolve) => {
    dlg.returnValue = 'cancel';
    dlg.showModal();
    (focusCancel ? cancelBtn : okBtn).focus();
    dlg.addEventListener('close', () => { resolve(dlg.returnValue === 'ok'); if (opener && opener.isConnected) opener.focus(); }, { once: true });
  });
}
let toastTimer;
function toast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('is-error', isError);
  el.hidden = true; void el.offsetWidth; el.hidden = false; // 연속 알림에도 등장 전환을 다시 재생
  // 화면 낭독기용 알림 영역은 항상 두고 문구만 바꾼다
  const live = $('#live'); live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 60);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 4500);
}

// ---------- 헤더 ----------
function renderHeader(active) {
  const role = S.role;
  const items = role === 'admin' || role === 'pending'
    ? [['모집 공고', '#/admin/recruitments', 'rec'], ['지원자 관리', '#/admin/applicants', 'app']]
    : [['연구실 탐색', '#/labs', 'labs'], ...(role === 'student' ? [['내 지원 현황', '#/my', 'my']] : [])];
  $('#nav').innerHTML = items.map(([label, href, key]) => `<a href="${href}" ${key === active ? 'aria-current="page"' : ''}>${label}</a>`).join('');
  $('#role').value = role;
  $('[data-home]').setAttribute('href', role === 'admin' || role === 'pending' ? '#/admin/recruitments' : '#/labs');
}
$('#role').addEventListener('change', async (e) => {
  const next = e.target.value;
  if (guard) {
    const ok = await confirmDialog({ title: guard.title, body: guard.body, ok: '이동', cancel: '계속 작성', focusCancel: true });
    if (!ok) { e.target.value = S.role; return; }
    guard = null;
  }
  S.role = next; save();
  const { parts } = parseHash();
  const isPublic = parts[0] === 'labs' || parts[0] === 'lab';
  if (next === 'admin' || next === 'pending') go('#/admin/recruitments', { replace: true });
  else if (isPublic) render();
  else go('#/labs', { replace: true });
});
$('#reset').addEventListener('click', async () => {
  const ok = await confirmDialog({ title: '데모 데이터를 초기화할까요?', body: '<p>제출·심사·공고 변경 내용이 처음 상태로 돌아가요.</p>', ok: '초기화', focusCancel: true });
  if (!ok) return;
  guard = null; S = seed(); save(); go('#/labs', { replace: true });
});

// ---------- 화면 전환 ----------
// 화면이 바뀌면 맨 위로 올리고 제목에 포커스, 목록 선택만 바뀌면 상세 제목으로, 같은 화면이면 포커스를 되살린다
let prevView = { path: null, key: null };
function render() {
  const activeId = document.activeElement && document.activeElement.id;
  renderView();
  const { parts, q } = parseHash();
  const path = parts.join('/');
  const key = q.get('app') || q.get('rec') || '';
  const focusQuiet = (el) => { el.tabIndex = -1; el.focus({ preventScroll: true }); };
  if (path !== prevView.path) {
    window.scrollTo(0, 0);
    const h = $('#view h1');
    if (prevView.path !== null && h) focusQuiet(h);
  } else if (key !== prevView.key) {
    const d = $('#my-detail, #rv-detail, #rec-detail');
    if (d) {
      if (window.innerWidth < 1024) d.scrollIntoView({ block: 'start' });
      const t = d.querySelector('h2');
      if (t) focusQuiet(t);
    }
  } else if (activeId && document.getElementById(activeId)) {
    document.getElementById(activeId).focus({ preventScroll: true });
  }
  prevView = { path, key };
}
function renderView() {
  lastHash = location.hash || '#/labs';
  $('#toast').hidden = true;
  const { parts, q } = parseHash();
  const view = $('#view');
  guard = null;
  const role = S.role;
  const page = parts[0];
  const TITLES = { labs: '연구실 탐색', lab: '연구실 상세', apply: '지원서 작성', my: '내 지원 현황', recruitments: '모집 공고 관리', applicants: '지원자 관리' };
  document.title = `${TITLES[page === 'admin' ? parts[1] : page] || '연구실 탐색'} · LabKnock`;
  if (page === 'lab') { renderHeader('labs'); return viewDetail(view, parts[1], parts[2], q); }
  if (page === 'apply') { renderHeader('labs'); return role === 'student' ? viewApply(view, parts[1]) : notAllowed(view); }
  if (page === 'my') { renderHeader('my'); return role === 'student' ? viewMy(view, q) : notAllowed(view); }
  if (page === 'admin' && parts[1] === 'recruitments') { renderHeader('rec'); return role === 'admin' ? viewRecruit(view, q) : role === 'pending' ? viewPending(view, '모집 공고 관리') : notAllowed(view); }
  if (page === 'admin' && parts[1] === 'applicants') { renderHeader('app'); return role === 'admin' ? viewReview(view, q) : role === 'pending' ? viewPending(view, '지원자 관리') : notAllowed(view); }
  renderHeader('labs');
  return viewLabs(view, q);
}
function notAllowed(view) {
  view.innerHTML = `<div class="lk-panel lk-empty"><p class="lk-item-title">이 계정으로는 볼 수 없는 화면이에요.</p><p class="lk-description" style="margin-top:8px">상단의 데모 계정을 바꾸거나 연구실 탐색으로 이동하세요.</p><p style="margin-top:16px"><a class="lk-button lk-button--secondary" href="#/labs">연구실 탐색</a></p></div>`;
}

// ---------- UI-01 연구실 탐색 ----------
let lastLabsQuery = '';
function publicRecs() { return Object.entries(S.recs).filter(([, r]) => r.published).map(([id, r]) => ({ id, ...r, status: recStatus(r) })); }
function viewLabs(view, q) {
  const allFields = [...new Set(publicRecs().flatMap((r) => S.labs[r.lab].fields))].sort((a, b) => a.localeCompare(b, 'ko'));
  const statuses = ['모집 중', '모집 예정', '마감'];
  let qText = (q.get('q') || '').trim();
  let field = q.get('field') || '';
  let status = q.get('status') || '';
  const notes = [];
  if (field && !allFields.includes(field)) { notes.push('선택했던 연구 분야를 찾을 수 없어 전체로 표시해요.'); field = ''; }
  if (status && !statuses.includes(status)) { notes.push('선택했던 모집 상태가 올바르지 않아 전체로 표시해요.'); status = ''; }
  const tooLong = chars(qText) > 50;
  lastLabsQuery = tooLong ? lastLabsQuery : location.hash.split('?')[1] || '';

  view.innerHTML = `
    <div class="page-head"><h1 class="lk-title">연구실 탐색</h1><p class="lk-description">연구 분야와 모집기간을 확인하고 공고를 살펴보세요.</p></div>
    <form class="search" id="search" novalidate>
      <label class="lk-label" for="q" style="grid-column:1/-1">연구실 이름 또는 연구 분야</label>
      <div class="search__input lk-field">
        <input class="lk-input" id="q" name="q" value="${esc(qText)}" placeholder="예: 인공지능" aria-describedby="q-err" autocomplete="off">
        <p class="lk-error" id="q-err" ${tooLong ? '' : 'hidden'}>${tooLong ? '검색어는 50자 이하로 입력해주세요.' : ''}</p>
      </div>
      <button class="lk-button" type="submit" id="search-btn">검색</button>
      <button class="lk-button lk-button--secondary" type="button" id="reset-filter">필터 초기화</button>
    </form>
    <div class="filters">
      <label class="lk-field"><span class="lk-label">연구 분야</span>
        <select class="lk-input" id="field"><option value="">전체</option>${allFields.map((f) => `<option ${f === field ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label>
      <label class="lk-field"><span class="lk-label">모집 상태</span>
        <select class="lk-input" id="status"><option value="">전체</option>${statuses.map((s) => `<option ${s === status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
    </div>
    ${notes.map((n) => `<p class="notice" style="margin-top:16px">${esc(n)}</p>`).join('')}
    <div id="results"></div>`;

  const input = $('#q');
  const err = $('#q-err');
  const apply = (over = {}) => {
    const v = input.value.trim();
    if (chars(v) > 50) { err.textContent = '검색어는 50자 이하로 입력해주세요.'; err.hidden = false; input.setAttribute('aria-invalid', 'true'); input.focus(); $('#field').value = field; $('#status').value = status; return; }
    const p = new URLSearchParams();
    const nq = over.q ?? v; const nf = over.field ?? $('#field').value; const ns = over.status ?? $('#status').value;
    if (nq) p.set('q', nq); if (nf) p.set('field', nf); if (ns) p.set('status', ns);
    go(`#/labs${p.toString() ? '?' + p : ''}`, { replace: false });
  };
  $('#search').addEventListener('submit', (e) => { e.preventDefault(); apply(); });
  $('#field').addEventListener('change', () => apply());
  $('#status').addEventListener('change', () => apply());
  $('#reset-filter').addEventListener('click', () => go('#/labs'));
  input.addEventListener('input', () => { if (chars(input.value.trim()) <= 50) { err.hidden = true; err.textContent = ''; input.removeAttribute('aria-invalid'); } });

  if (tooLong) {
    input.setAttribute('aria-invalid', 'true');
    $('#results').innerHTML = `<p class="lk-description" style="margin-top:24px">검색어를 고친 뒤 다시 검색하세요.</p>`;
    return;
  }
  const nq = norm(qText);
  const rows = publicRecs()
    .filter((r) => { const lab = S.labs[r.lab]; return !nq || norm(lab.name).includes(nq) || lab.fields.some((f) => norm(f).includes(nq)); })
    .filter((r) => !field || S.labs[r.lab].fields.includes(field))
    .filter((r) => !status || r.status === status)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || S.labs[a.lab].name.localeCompare(S.labs[b.lab].name, 'ko') || a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
  const back = encodeURIComponent(location.hash.split('?')[1] || '');
  $('#results').innerHTML = rows.length ? `
    <p class="result-count">모집 공고 ${rows.length}건<span class="lk-caption">모집 중 → 모집 예정 → 마감 순</span></p>
    <ul class="lk-lab-list">${rows.map((r) => { const lab = S.labs[r.lab]; const href = `#/lab/${r.lab}/${r.id}?back=${back}`; return `
      <li class="lk-lab-row lab-row">
        <div class="lab-row__title"><div><h2 class="lk-item-title"><a class="lab-name-link" href="${href}">${esc(lab.name)}</a></h2><p>${esc(r.title)}</p></div>${badge(r.status)}</div>
        <div class="lab-row__meta"><span><b>연구 분야</b>${esc(lab.fields.join(' · '))}</span><span><b>요구 역량</b>${esc(r.skills || '별도 요구 없음')}</span></div>
        <div class="lab-row__foot"><span class="lab-row__meta lk-tabular"><span><b>모집기간</b>${period(r)}</span></span>
          <a class="detail-link" href="${href}" aria-label="${esc(lab.name)} 상세 보기">상세 보기 ›</a></div>
      </li>`; }).join('')}</ul>`
    : `<div class="lk-panel lk-empty" style="margin-top:24px"><p class="lk-item-title">조건에 맞는 모집 공고가 없어요.</p><p class="lk-description" style="margin:8px 0 16px">검색어나 필터를 바꾸거나 초기화해보세요.</p><button class="lk-button lk-button--secondary" type="button" id="empty-reset">필터 초기화</button></div>`;
  const er = $('#empty-reset'); if (er) er.addEventListener('click', () => go('#/labs'));
}

// ---------- UI-02 연구실 상세 ----------
function viewDetail(view, labId, recId, q) {
  const r = S.recs[recId];
  if (!r || !r.published || r.lab !== labId) {
    view.innerHTML = `<div class="lk-panel lk-empty"><p class="lk-item-title">공고를 찾을 수 없어요.</p><p style="margin-top:16px"><a class="lk-button lk-button--secondary" href="#/labs">연구실 탐색</a></p></div>`;
    return;
  }
  const lab = S.labs[labId];
  const st = recStatus(r);
  const back = q.get('back') || ''; // 탐색 화면의 적용 조건(이미 인코딩된 질의 문자열)을 그대로 돌려준다 (FR-01-07)
  view.innerHTML = `
    <a class="back-link" href="#/labs${back ? '?' + esc(back) : ''}">← 연구실 탐색</a>
    <div class="page-head"><h1 class="lk-title">${esc(lab.name)}</h1><p class="lk-description">${esc(r.title)} · 소프트웨어학과</p></div>
    <div class="split">
      <article class="lk-panel">
        <section class="section"><h3>연구실 소개</h3><p>${esc(lab.intro)}</p>
          <dl class="kv" style="margin-top:8px"><dt>담당 교수</dt><dd>${esc(lab.professor)}</dd><dt>연구 분야</dt><dd>${esc(lab.fields.join(' · '))}</dd></dl></section>
        <section class="section"><h3>연구 주제</h3><p>${esc(r.topic)}</p></section>
        <section class="section"><h3>요구 역량</h3><p>${esc(r.skills || '별도 요구 없음')}</p></section>
        <section class="section"><h3>활동 방식</h3><p>${esc(r.activity)}</p></section>
      </article>
      <aside class="lk-panel apply-panel" aria-label="지원">
        ${badge(st)}
        <div><p class="strong">모집기간</p><p class="lk-tabular">${period(r)}</p></div>
        <p class="strong">모집 인원 ${esc(r.capacity)}명</p>
        <hr class="divider" style="margin:0">
        <div><p class="strong">제출 자료</p><p>CV 필수</p><p>성적증명서·포트폴리오 선택</p></div>
        <div id="apply-area"></div>
      </aside>
    </div>`;
  // 3.1.7 상세 지원 영역의 판단 순서
  const area = $('#apply-area');
  const role = S.role;
  const mine = role === 'student' ? myAppFor(recId) : null;
  const disabledBtn = (label) => `<button class="lk-button" disabled>${label}</button>`;
  if (mine) {
    const s = appStatus(mine);
    area.innerHTML = `<div class="stack"><p>이미 지원한 공고예요. 현재 상태 ${badge(s)}</p>${s === '철회' ? '<p class="lk-help">철회한 공고에는 다시 지원할 수 없어요.</p>' : ''}<a class="lk-button lk-button--secondary" href="#/my?app=${mine.id}">내 지원 현황 보기</a></div>`;
  } else if (role === 'admin' || role === 'pending') {
    area.innerHTML = `<p class="lk-help">지원은 학생 계정 전용 기능이에요. 관리자 계정은 공고를 조회만 할 수 있어요.</p>`;
  } else if (st === '모집 예정') {
    area.innerHTML = `<div class="stack">${disabledBtn('지원서 작성')}<p class="lk-help">${fmtDate(r.start)}부터 지원할 수 있어요.</p></div>`;
  } else if (st === '마감') {
    area.innerHTML = `<div class="stack">${disabledBtn('지원서 작성')}<p class="lk-help">${r.earlyClosedAt ? '연구실이 모집을 조기 마감했어요.' : '모집기간이 끝났어요.'}</p></div>`;
  } else if (role === 'visitor') {
    area.innerHTML = `<div class="stack"><p class="lk-help deadline"><span class="dday">${dday(r)}</span>${fmtDate(r.end)}까지 지원할 수 있어요</p><p class="lk-help">학교 이메일로 로그인한 학생만 지원할 수 있어요.</p><button class="lk-button" id="login">로그인 후 지원</button></div>`;
    $('#login').addEventListener('click', () => { S.role = 'student'; save(); render(); toast('가상 학생 계정으로 로그인했어요.'); });
  } else {
    area.innerHTML = `<div class="stack"><p class="lk-help deadline"><span class="dday">${dday(r)}</span>${fmtDate(r.end)}까지 지원할 수 있어요</p><button class="lk-button" id="to-apply">지원서 작성</button></div>`;
    $('#to-apply').addEventListener('click', () => {
      if (recStatus(S.recs[recId]) !== '모집 중' || myAppFor(recId)) { render(); toast('공고 상태가 바뀌었어요. 최신 정보를 확인하세요.', true); return; }
      go(`#/apply/${recId}`);
    });
  }
}

// ---------- UI-03 지원서 작성 ----------
function viewApply(view, recId) {
  const r = S.recs[recId];
  if (!r || recStatus(r) !== '모집 중' || myAppFor(recId)) {
    view.innerHTML = `<div class="lk-panel lk-empty"><p class="lk-item-title">지금은 이 공고에 지원할 수 없어요.</p><p class="lk-description" style="margin-top:8px">모집 상태가 바뀌었거나 이미 지원한 공고예요.</p><p style="margin-top:16px"><a class="lk-button lk-button--secondary" href="#/labs">연구실 탐색</a></p></div>`;
    return;
  }
  const lab = S.labs[r.lab];
  const f = { cv: null, grade: null, pfMode: 'none', pf: null, link: '' };
  view.innerHTML = `
    <div class="page-head"><h1 class="lk-title">지원서 작성</h1><p class="lk-description">${esc(lab.name)} · ${esc(r.title)}</p></div>
    <div class="profile-box"><span class="strong">내 프로필</span><div><p>${ME.name} · ${ME.dept} · ${ME.year}학년</p><p class="lk-caption">${ME.email} · 확인 완료 · 읽기 전용</p></div></div>
    <div id="err-summary" class="error-summary" role="alert" hidden></div>
    <form id="apply" novalidate>
      <div class="form-grid">
        <div class="form-col">
          <div class="lk-field"><label class="lk-label" for="intro">자기소개<span class="req">필수</span><span class="opt">공백 제외 1~1,000자</span></label>
            <textarea class="lk-input" id="intro" aria-describedby="intro-err intro-count"></textarea>
            <p class="lk-caption counter" id="intro-count">공백 제외 0 / 1,000자</p>
            <p class="lk-error" id="intro-err" hidden></p></div>
          <div class="lk-field"><label class="lk-label" for="course">진학 희망 과정<span class="req">필수</span></label>
            <select class="lk-input" id="course" aria-describedby="course-err"><option value="">선택하세요</option>${['학석연계', '석사', '석박통합', '미정', '진학 계획 없음'].map((c) => `<option>${c}</option>`).join('')}</select>
            <p class="lk-error" id="course-err" hidden></p></div>
        </div>
        <div class="form-col">
          <h2 class="lk-item-title">첨부 자료</h2>
          ${fileField('cv', 'CV', true)}
          ${fileField('grade', '성적증명서', false)}
          <fieldset class="lk-field" style="border:0;padding:0;margin:0"><legend class="lk-label">포트폴리오<span class="opt">선택</span></legend>
            <div class="radio-row">${[['none', '없음'], ['pdf', 'PDF'], ['link', 'https 링크']].map(([v, l]) => `<label><input type="radio" name="pf" value="${v}" ${v === 'none' ? 'checked' : ''}> ${l}</label>`).join('')}</div>
            <div id="pf-area"></div></fieldset>
          <p class="lk-help">PDF는 항목별 1개 · 각 10MB 이하</p>
        </div>
      </div>
      <div class="form-actions">
        <a class="lk-button lk-button--secondary" href="#/lab/${r.lab}/${recId}">연구실 상세 보기</a>
        <button class="lk-button" type="submit" id="submit">지원서 제출</button>
      </div>
    </form>`;

  // 작성 내용이나 파일이 있을 때만 이탈을 확인하고(FR-03-09), 오류를 고치면 요약의 항목 수를 다시 센다
  const markDirty = () => {
    const dirty = intro.value.trim() || $('#course').value || f.cv || f.grade || f.pf || f.link.trim();
    guard = dirty ? { title: '작성 중인 지원서가 있어요', body: '<p>지금 이동하면 입력한 내용과 선택한 파일이 저장되지 않아요.</p>' } : null;
    const sum = $('#err-summary');
    if (!sum.hidden) {
      const n = $$('#apply .lk-error').filter((x) => !x.hidden).length;
      if (n) sum.textContent = `입력을 확인해주세요 · ${n}개 항목`; else sum.hidden = true;
    }
  };
  const intro = $('#intro');
  intro.addEventListener('input', () => {
    clearErr($('#intro-err'), intro);
    const n = chars(intro.value.replace(/\s/gu, ''));
    const counter = $('#intro-count');
    counter.textContent = n > 1000 ? `공백 제외 ${n.toLocaleString()} / 1,000자 · ${(n - 1000).toLocaleString()}자 초과` : `공백 제외 ${n.toLocaleString()} / 1,000자`;
    counter.classList.toggle('is-over', n > 1000);
    markDirty();
  });
  $('#course').addEventListener('change', () => { clearErr($('#course-err'), $('#course')); markDirty(); });

  function bindFile(key) {
    const input = $(`#${key}-input`);
    input.addEventListener('change', () => {
      const file = input.files[0];
      input.value = '';
      if (!file) return;
      const errEl = $(`#${key}-err`);
      if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) { showErr(errEl, $(`#${key}-box`), 'PDF 파일을 선택해주세요.'); return; }
      if (file.size < 1 || file.size > 10_000_000) { showErr(errEl, $(`#${key}-box`), '파일은 10MB 이하여야 해요. 용량을 줄여 다시 선택해주세요.'); return; }
      f[key] = file; clearErr(errEl, $(`#${key}-box`)); paintFile(key); markDirty();
      $(`#${key}-box .clear-btn`).focus(); // 누른 버튼이 사라지므로 바로 옆 버튼으로 포커스를 옮긴다
    });
  }
  function paintFile(key) {
    const box = $(`#${key}-box`);
    const file = f[key];
    $('.file-box__name', box).textContent = file ? `${file.name} · PDF · ${fmtSize(file.size)}` : '선택한 파일 없음';
    $('.file-box__name', box).classList.toggle('empty', !file);
    $('.pick-btn', box).hidden = !!file;
    $('.clear-btn', box).hidden = !file;
  }
  function wireFile(key) {
    bindFile(key);
    $(`#${key}-box .pick-btn`).addEventListener('click', () => $(`#${key}-input`).click());
    $(`#${key}-box .clear-btn`).addEventListener('click', () => { f[key] = null; paintFile(key); markDirty(); $(`#${key}-box .pick-btn`).focus(); });
  }
  wireFile('cv'); wireFile('grade');

  function paintPf() {
    const area = $('#pf-area');
    if (f.pfMode === 'pdf') { area.innerHTML = fileField('pf', '포트폴리오 PDF', false, true); wireFile('pf'); paintFile('pf'); }
    else if (f.pfMode === 'link') {
      area.innerHTML = `<div class="lk-field"><label class="lk-label" for="link">포트폴리오 링크<span class="opt">https 주소 · 2,048자 이하</span></label><input class="lk-input" id="link" type="url" placeholder="https://" value="${esc(f.link)}" aria-describedby="link-err"><p class="lk-error" id="link-err" hidden></p></div>`;
      $('#link').addEventListener('input', (e) => { f.link = e.target.value; clearErr($('#link-err'), e.target); markDirty(); });
    } else area.innerHTML = '';
  }
  $$('input[name="pf"]').forEach((radio) => radio.addEventListener('change', async () => {
    const had = (f.pfMode === 'pdf' && f.pf) || (f.pfMode === 'link' && f.link.trim());
    if (had) {
      const ok = await confirmDialog({ title: '포트폴리오 방식을 바꿀까요?', body: '<p>지금 선택한 포트폴리오는 제출되지 않아요.</p>', ok: '방식 변경', cancel: '그대로 두기', focusCancel: true });
      if (!ok) { $(`input[name="pf"][value="${f.pfMode}"]`).checked = true; return; }
      f.pf = null; f.link = '';
    }
    f.pfMode = radio.value; paintPf(); markDirty();
  }));

  $('#apply').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errors = [];
    const introLen = chars(intro.value.replace(/\s/gu, ''));
    const check = (cond, id, box, msg) => { const el = $(`#${id}-err`); if (cond) { showErr(el, box, msg); errors.push([box, msg]); } else clearErr(el, box); };
    check(introLen < 1 || introLen > 1000, 'intro', intro, introLen < 1 ? '자기소개를 입력해주세요.' : '자기소개는 공백 제외 1,000자 이하로 줄여주세요.');
    check(!$('#course').value, 'course', $('#course'), '진학 희망 과정을 선택해주세요.');
    check(!f.cv, 'cv', $('#cv-box'), 'CV PDF 파일을 선택해주세요.');
    if (f.pfMode === 'pdf') check(!f.pf, 'pf', $('#pf-box'), '포트폴리오 PDF를 선택하거나 방식을 ‘없음’으로 바꿔주세요.');
    if (f.pfMode === 'link') {
      let bad = '';
      try { const u = new URL(f.link.trim()); if (u.protocol !== 'https:' || !u.hostname || u.username || u.password || f.link.length > 2048) bad = 'x'; } catch { bad = 'x'; }
      check(!!bad, 'link', $('#link'), 'https://로 시작하는 올바른 주소를 입력해주세요.');
    }
    const sum = $('#err-summary');
    if (errors.length) {
      sum.hidden = false; sum.textContent = `입력을 확인해주세요 · ${errors.length}개 항목`;
      errors[0][0].focus?.(); errors[0][0].scrollIntoView({ block: 'center' });
      if (errors[0][0].classList.contains('file-box')) $('.pick-btn', errors[0][0]).focus();
      return;
    }
    sum.hidden = true;
    const attach = [f.cv && `CV · ${f.cv.name}`, f.grade && `성적증명서 · ${f.grade.name}`, f.pfMode === 'pdf' && `포트폴리오 · ${f.pf.name}`, f.pfMode === 'link' && `포트폴리오 링크 · ${f.link}`].filter(Boolean);
    const ok = await confirmDialog({
      title: '지원서를 제출할까요?',
      body: `<p><b>${esc(lab.name)}</b> · ${esc(r.title)}</p><p>제출 후에는 내용을 수정할 수 없어요. 철회는 내 지원 현황에서 할 수 있어요.</p><ul style="margin:0;padding-left:18px">${attach.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`,
      ok: '지원서 제출',
    });
    if (!ok) return;
    const btn = $('#submit'); btn.style.minWidth = `${btn.offsetWidth}px`; btn.disabled = true; btn.textContent = '제출 중…'; // 처리 중에도 버튼 폭 유지
    await new Promise((res) => setTimeout(res, 700));
    if (recStatus(S.recs[recId]) !== '모집 중' || myAppFor(recId)) { btn.disabled = false; btn.textContent = '지원서 제출'; toast('공고 상태가 바뀌어 제출하지 못했어요. 입력 내용은 그대로 있어요.', true); return; }
    S.seq += 1;
    const key = `A0${S.seq}`;
    const at = nowIso();
    const files = [];
    [['cv', 'CV'], ['grade', '성적증명서'], ['pf', '포트폴리오']].forEach(([k, label]) => { if (f[k]) { files.push(f[k].name); blobs[`${key}:${f[k].name}`] = URL.createObjectURL(f[k]); } });
    if (f.pfMode === 'link') files.push(f.link.trim());
    // 제출 당시 프로필(이름·학교 이메일·학과·학년)을 함께 저장한다 (6.2.4 profileSnapshot)
    S.apps[key] = { id: `A-0${S.seq}`, rec: recId, student: ME.name, email: ME.email, dept: ME.dept, year: ME.year, mine: true, intro: intro.value.trim(), course: $('#course').value, files, submittedAt: at, history: [['지원 완료', at]] };
    save(); guard = null;
    go(`#/my?app=${key}`);
    toast(`지원서를 제출했어요. 접수번호 A-0${S.seq}`);
  });
}
function fileField(key, label, required, bare = false) {
  return `<div class="lk-field">${bare ? '' : `<span class="lk-label" id="${key}-label">${label}${required ? '<span class="req">필수</span>' : '<span class="opt">선택</span>'}</span>`}
    <div class="file-box" id="${key}-box" tabindex="-1" role="group" ${bare ? `aria-label="${label}"` : `aria-labelledby="${key}-label"`} aria-describedby="${key}-err">
      <span class="file-box__name empty">선택한 파일 없음</span>
      <button type="button" class="lk-button lk-button--secondary small-btn pick-btn">파일 선택</button>
      <button type="button" class="lk-button lk-button--secondary small-btn clear-btn" hidden>선택 취소</button>
    </div>
    <input type="file" id="${key}-input" accept="application/pdf,.pdf" hidden>
    <p class="lk-error" id="${key}-err" hidden></p></div>`;
}
function showErr(el, box, msg) { el.textContent = msg; el.hidden = false; box.setAttribute('aria-invalid', 'true'); }
function clearErr(el, box) { el.hidden = true; el.textContent = ''; box.removeAttribute('aria-invalid'); }

// ---------- UI-04 내 지원 현황 ----------
// 미리 넣어 둔 가상 지원서의 첨부는 발표용 예시 PDF로 연다
const SAMPLE_FILES = { 'CV.pdf': 'assets/samples/sample-cv.pdf', '성적증명서.pdf': 'assets/samples/sample-transcript.pdf' };
function fileLinks(key, a) {
  return a.files.map((name) => {
    if (/^https:/.test(name)) return `<a class="lk-link" href="${esc(name)}" target="_blank" rel="noopener noreferrer">포트폴리오 링크 열기</a>`;
    const url = blobs[`${key}:${name}`] || (a.sample ? SAMPLE_FILES[name] : null);
    return url ? `<a class="lk-link" href="${url}" target="_blank" rel="noopener">${esc(name)} 보기</a>` : `<span>${esc(name)}</span>`;
  }).join(' · ');
}
function viewMy(view, q) {
  const mine = Object.entries(S.apps).filter(([, a]) => a.mine).sort((x, y) => y[1].submittedAt.localeCompare(x[1].submittedAt));
  const sel = q.get('app');
  const cur = sel && S.apps[sel] && S.apps[sel].mine ? S.apps[sel] : null;
  const denied = sel && !cur; // 없는 ID와 타인 ID는 같은 접근 불가 결과 (FR-04-03.2)
  view.innerHTML = `
    <div class="page-head"><h1 class="lk-title">내 지원 현황</h1><p class="lk-description">본인이 제출한 지원서와 상태 이력을 확인하세요.</p></div>
    <div class="split split--list">
      <section class="lk-panel"><h2 class="lk-item-title" style="margin-bottom:12px">지원 목록</h2>
        ${mine.length ? `<ul class="pick-list">${mine.map(([k, a]) => { const r = S.recs[a.rec]; return `<li><a class="pick" href="#/my?app=${k}" aria-current="${k === sel}">
          <span class="pick__title"><span>${esc(S.labs[r.lab].name)}</span></span><span>${esc(r.title)}</span>
          <span class="lk-caption lk-tabular">제출 ${fmtDate(new Date(a.submittedAt).toLocaleDateString('sv'))}</span><span>${badge(appStatus(a))}</span></a></li>`; }).join('')}</ul>
          <p class="lk-caption" style="margin-top:12px">최신 제출순</p>` : '<p class="lk-description">아직 제출한 지원서가 없어요.</p><p style="margin-top:12px"><a class="lk-button lk-button--secondary" href="#/labs">연구실 탐색</a></p>'}
      </section>
      <section class="lk-panel" id="my-detail"></section>
    </div>`;
  const box = $('#my-detail');
  if (!cur) {
    box.innerHTML = denied
      ? '<div class="empty-detail"><p class="lk-item-title">지원서를 찾을 수 없거나 볼 수 없어요.</p><p class="lk-description" style="margin-top:8px">목록에서 본인 지원서를 선택하세요.</p></div>'
      : `<p class="empty-detail">${mine.length ? '목록에서 지원서를 선택하세요.' : '제출한 지원서가 생기면 여기에서 확인할 수 있어요.'}</p>`;
    return;
  }
  const r = S.recs[cur.rec];
  const s = appStatus(cur);
  const canWithdraw = ['지원 완료', '검토 중', '면담'].includes(s);
  box.innerHTML = `
    <div class="row"><div><h2 class="lk-item-title">${esc(r.title)}</h2><p class="lk-description">${esc(S.labs[r.lab].name)} · 접수번호 ${cur.id}</p></div><span class="spacer"></span>${badge(s)}</div>
    ${stepper(cur)}
    <p class="status-note">${STATUS_NOTE[s]}</p>
    <section class="section"><h3>제출 내용 <span class="lk-caption">제출 당시 기준 · 읽기 전용</span></h3>
      <dl class="kv"><dt>지원자</dt><dd>${esc(cur.student)} · ${esc(cur.dept || ME.dept)} · ${cur.year || ME.year}학년</dd><dt>학교 이메일</dt><dd>${esc(cur.email || ME.email)}</dd><dt>진학 희망</dt><dd>${esc(cur.course)}</dd><dt>첨부</dt><dd>${fileLinks(sel, cur)}</dd></dl>
      <p class="quote" style="margin-top:8px">${esc(cur.intro)}</p></section>
    <section class="section"><h3>상태 이력</h3><ol class="history">${cur.history.map(([st, at]) => `<li><time>${fmtDateTime(at)}</time><span>${st}</span></li>`).join('')}</ol></section>
    <div class="form-actions" style="margin-top:24px">
      <a class="lk-button lk-button--secondary" href="#/lab/${r.lab}/${cur.rec}">현재 모집 공고 보기</a>
      ${canWithdraw ? '<button class="lk-button lk-button--secondary danger-outline" id="withdraw">지원 철회</button>' : ''}
    </div>`;
  const wd = $('#withdraw');
  if (wd) wd.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: '지원을 철회할까요?', body: `<p><b>${esc(S.labs[r.lab].name)}</b> · ${esc(r.title)}</p><p>철회하면 되돌릴 수 없고 같은 공고에 다시 지원할 수 없어요.</p>`, ok: '지원 철회', danger: true, focusCancel: true });
    if (!ok) return;
    if (!['지원 완료', '검토 중', '면담'].includes(appStatus(S.apps[sel]))) { render(); toast('상태가 이미 바뀌어 철회하지 못했어요.', true); return; }
    S.apps[sel].history.push(['철회', nowIso()]); save(); render(); toast('지원을 철회했어요.');
  });
}

// ---------- 관리자 신청자(승인 전) ----------
function viewPending(view, title) {
  view.innerHTML = `
    <div class="page-head"><h1 class="lk-title">${title}</h1><p class="lk-description">연구실 소속 인증이 승인되면 모집 공고와 지원자를 관리할 수 있어요.</p></div>
    <div class="lk-panel" style="max-width:720px">
      <div class="row"><h2 class="lk-item-title">연구실 소속 인증</h2><span class="spacer"></span>${badge('승인 대기')}</div>
      <ol class="stepper" aria-label="인증 진행 단계">
        <li class="stepper__item is-done"><span class="stepper__bar"></span><span class="stepper__label">학교 이메일 확인</span><span class="sr-only">완료</span></li>
        <li class="stepper__item is-done"><span class="stepper__bar"></span><span class="stepper__label">소속 인증 신청</span><span class="sr-only">완료</span></li>
        <li class="stepper__item is-current"><span class="stepper__bar"></span><span class="stepper__label">운영 보조 검토</span><span class="sr-only">현재 단계</span></li>
        <li class="stepper__item"><span class="stepper__bar"></span><span class="stepper__label">승인·연구실 배정</span><span class="sr-only">아직 아님</span></li>
      </ol>
      <dl class="kv" style="margin-top:16px"><dt>학교 이메일</dt><dd>admin-b@skku.edu · 확인 완료</dd><dt>신청 연구실</dt><dd>컴퓨팅시스템 연구실</dd><dt>소속 설명</dt><dd>연구실 박사과정, 지도교수 관리 위임</dd><dt>증빙</dt><dd>소속확인서.pdf</dd><dt>신청 시각</dt><dd class="lk-tabular">2026.11.15 11:02:31</dd></dl>
      <hr class="divider">
      <p class="lk-help">운영 보조가 신청 내용을 검토하고 있어요. 승인 전에는 공고 초안도 만들 수 없어요. 반려되면 사유를 확인한 뒤 새로 신청할 수 있어요.</p>
    </div>`;
}

// ---------- UI-05 모집 공고 관리 ----------
const REC_FIELDS = { title: '공고명', topic: '연구 주제', activity: '활동 방식', skills: '요구 역량', capacity: '모집 인원', start: '모집 시작일', end: '모집 마감일' };
const ADMIN_NAME = '가상 관리자';
function viewRecruit(view, q) {
  // FR-05-08: 공고명·상태·기간·접수 수·마지막 저장 시각을 보여 주고 마지막 저장 내림차순으로 정렬
  const mine = Object.entries(S.recs).filter(([, r]) => r.lab === ADMIN_LAB).sort((x, y) => (y[1].savedAt || '').localeCompare(x[1].savedAt || ''));
  let sel = q.get('rec');
  if (sel !== 'new' && (!sel || !S.recs[sel] || S.recs[sel].lab !== ADMIN_LAB)) sel = mine[0] && mine[0][0];
  const isNew = sel === 'new';
  const r = isNew ? { lab: ADMIN_LAB, title: '', topic: '', activity: '', skills: '', capacity: '', start: '', end: '', published: false, earlyClosedAt: null, savedAt: null, log: [] } : S.recs[sel];
  const st = isNew ? '작성 중' : recStatus(r);
  const n = isNew ? 0 : appsOf(sel).length;
  const locked = n > 0;           // INV-06 첫 지원 이후 일반 항목 고정
  const closed = st === '마감';
  const ro = locked || closed;
  view.innerHTML = `
    <div class="page-head"><h1 class="lk-title">모집 공고 관리</h1><p class="lk-description">${esc(S.labs[ADMIN_LAB].name)} · 지원자가 있는 공고는 기간 연장과 조기 마감만 가능해요.</p></div>
    <div class="split split--list">
      <section class="lk-panel"><div class="row" style="margin-bottom:12px"><h2 class="lk-item-title">공고 목록</h2><span class="spacer"></span><a class="lk-button lk-button--secondary small-btn" href="#/admin/recruitments?rec=new">새 공고</a></div>
        <ul class="pick-list">
          ${isNew ? `<li><span class="pick" aria-current="true"><span class="pick__title"><span>새 공고</span></span><span>${badge('작성 중')}</span><span class="lk-caption">아직 저장하지 않았어요</span></span></li>` : ''}
          ${mine.map(([id, x]) => `<li><a class="pick" href="#/admin/recruitments?rec=${id}" aria-current="${id === sel}">
            <span class="pick__title"><span>${esc(x.title)}</span></span><span>${badge(recStatus(x))}</span>
            <span class="lk-caption lk-tabular">기간 ${period(x)} · 지원 ${appsOf(id).length}건</span>
            <span class="lk-caption lk-tabular">마지막 저장 ${fmtDateTime(x.savedAt)}</span></a></li>`).join('')}
        </ul>
        <p class="lk-caption" style="margin-top:12px">최근 저장순</p></section>
      <section class="lk-panel" id="rec-detail">
        <div class="rec-head"><div><h2 class="lk-item-title">${esc(r.title || '새 공고')}</h2><p class="lk-caption lk-tabular">${r.savedAt ? '마지막 저장 ' + fmtDateTime(r.savedAt) : '아직 저장하지 않았어요'}</p></div>
          <div class="row">${badge(st)}<span class="strong">지원 ${n}건</span>${!isNew && r.published ? `<a class="lk-button lk-button--secondary small-btn" href="#/admin/applicants?rec=${sel}">지원자 보기</a>` : ''}</div></div>
        <form id="rec-form" novalidate>
          <div class="field-grid">
            ${recField('title', r.title, ro, '필수', '1~100자', 'full')}
            ${recField('topic', r.topic, ro, '게시 시 필수', '1~200자')}
            ${recField('activity', r.activity, ro, '게시 시 필수', '1~200자')}
            ${recField('skills', r.skills, ro, '', '선택 · 0~300자')}
            ${recField('capacity', r.capacity, ro, '게시 시 필수', '1~99명', '', 'number')}
            ${recField('start', r.start, ro, '게시 시 필수', '', '', 'date')}
            ${locked && !closed
              ? recField('end', r.end, false, '', `현재 마감일 ${fmtDate(r.end)} · 더 늦은 날짜로만 연장`, '', 'date', '새 마감일')
              : recField('end', r.end, closed, '게시 시 필수', '', '', 'date')}
          </div>
          <p class="lk-error" id="form-err" role="alert" hidden style="margin-top:16px"></p>
          ${isNew ? '<p class="lk-help" id="publish-hint" style="margin-top:16px">게시하려면 먼저 초안을 저장하세요. 저장한 공고만 게시할 수 있어요.</p>' : ''}
          <div class="form-actions" style="justify-content:flex-end">${recActions(r, st, locked, isNew)}</div>
        </form>
        ${isNew ? '' : `<section class="log-section"><h3>변경 이력</h3>${(r.log || []).length
          ? `<ol class="history">${r.log.map(([act, at, detail, who]) => `<li><time>${fmtDateTime(at)}</time><span>${esc(act)}${detail ? ` <span class="muted">· ${esc(detail)}</span>` : ''} <span class="lk-caption">${esc(who || ADMIN_NAME)}</span></span></li>`).join('')}</ol>`
          : '<p class="lk-help">아직 기록이 없어요.</p>'}</section>`}
      </section>
    </div>`;

  const form = $('#rec-form');
  const val = (k) => ($(`#f-${k}`) ? $(`#f-${k}`).value.trim() : '');
  const collect = () => ({ title: val('title'), topic: val('topic'), activity: val('activity'), skills: val('skills'), capacity: val('capacity'), start: val('start'), end: val('end') });
  const initial = JSON.stringify(collect());
  form.addEventListener('input', (e) => {
    // FR-05-11: 저장한 값과 달라졌을 때만 이탈을 확인한다
    guard = JSON.stringify(collect()) !== initial ? { title: '저장하지 않은 공고 내용이 있어요', body: '<p>지금 이동하면 변경한 내용이 저장되지 않아요.</p>' } : null;
    const t = e.target;
    if (t.getAttribute('aria-invalid')) { t.removeAttribute('aria-invalid'); const er = $(`#${t.id}-err`); if (er) { er.hidden = true; er.textContent = ''; } }
  });
  const clear = () => { $$('.lk-error', form).forEach((x) => { x.hidden = true; x.textContent = ''; }); $$('[aria-invalid]', form).forEach((x) => x.removeAttribute('aria-invalid')); };
  // 모든 칸을 검사해 각 칸 아래에 이유를 표시하고 첫 오류 칸으로 이동한다 (FR-05-02, InlineError)
  const showErrors = (errs) => {
    clear();
    errs.forEach(([k, msg]) => { const e = $(`#f-${k}-err`); e.textContent = msg; e.hidden = false; $(`#f-${k}`).setAttribute('aria-invalid', 'true'); });
    if (errs.length) $(`#f-${errs[0][0]}`).focus();
    return errs.length === 0;
  };
  // full=false: 초안 저장(공고명만 필수, 입력한 값은 길이·형식·날짜 순서 검사) / full=true: 게시·게시 공고 저장
  const checks = (d, full) => {
    const errs = [];
    if (chars(d.title) < 1 || chars(d.title) > 100) errs.push(['title', '공고명을 1~100자로 입력해주세요.']);
    if (full && chars(d.topic) < 1) errs.push(['topic', '게시하려면 연구 주제를 입력해주세요.']);
    else if (chars(d.topic) > 200) errs.push(['topic', '연구 주제는 200자 이하로 입력해주세요.']);
    if (full && chars(d.activity) < 1) errs.push(['activity', '게시하려면 활동 방식을 입력해주세요.']);
    else if (chars(d.activity) > 200) errs.push(['activity', '활동 방식은 200자 이하로 입력해주세요.']);
    if (chars(d.skills) > 300) errs.push(['skills', '요구 역량은 300자 이하로 입력해주세요.']);
    if (full || d.capacity) { const c = Number(d.capacity); if (!d.capacity || !Number.isInteger(c) || c < 1 || c > 99) errs.push(['capacity', '모집 인원은 1~99 사이 정수로 입력해주세요.']); }
    if (full && !d.start) errs.push(['start', '모집 시작일을 입력해주세요.']);
    if (full && !d.end) errs.push(['end', '모집 마감일을 입력해주세요.']);
    else if (d.start && d.end && d.start > d.end) errs.push(['end', '모집 마감일은 시작일보다 빠를 수 없어요.']);
    else if (full && d.end < todayIso()) errs.push(['end', '마감일이 이미 지났어요. 오늘 이후 날짜를 선택해주세요.']);
    return errs;
  };
  const shown = (k, v) => (v === '' || v == null ? '(빈 값)' : k === 'start' || k === 'end' ? fmtDate(v) : String(v));
  const diff = (d) => Object.keys(REC_FIELDS).filter((k) => String(d[k] ?? '') !== String(r[k] ?? '')).map((k) => `${REC_FIELDS[k]} ${shown(k, r[k])} → ${shown(k, d[k])}`).join(', ');
  // 저장할 때마다 마지막 저장 시각과 변경 이력(주체·시각·종류·변경 전후)을 남긴다 (FR-05-07)
  const commit = (id, patch, msg, action, detail = '') => {
    const base = S.recs[id] || r; const at = nowIso();
    S.recs[id] = { ...base, ...patch, savedAt: at, log: [...(base.log || []), [action, at, detail, ADMIN_NAME]] };
    save(); guard = null; go(`#/admin/recruitments?rec=${id}`, { replace: true }); toast(msg);
  };
  const newId = () => { let i = 8; while (S.recs[`R${i}`]) i += 1; return `R${i}`; };

  on('#save-draft', () => {
    const d = collect(); if (!showErrors(checks(d, false))) return;
    commit(isNew ? newId() : sel, d, '초안을 저장했어요. 학생에게는 아직 보이지 않아요.', '초안 저장');
  });
  on('#publish', async () => {
    if (isNew) return; // 새 공고는 초안을 먼저 저장해야 게시할 수 있다 (UI-05)
    const d = collect(); if (!showErrors(checks(d, true))) return;
    const ok = await confirmDialog({ title: '공고를 게시할까요?', body: `<p><b>${esc(d.title)}</b></p><p class="lk-tabular">모집기간 ${fmtDate(d.start)} – ${fmtDate(d.end)} · ${esc(d.capacity)}명</p><p>게시하면 연구실 탐색에 바로 공개되고 게시를 취소할 수 없어요. 첫 지원 이후에는 기간 연장과 조기 마감만 할 수 있어요.</p>`, ok: '공고 게시' });
    if (!ok) return;
    commit(sel, { ...d, capacity: Number(d.capacity), published: true }, '공고를 게시했어요. 연구실 탐색에서 확인할 수 있어요.', '게시', `모집기간 ${fmtDate(d.start)} – ${fmtDate(d.end)} · ${d.capacity}명`);
  });
  on('#save-edit', () => {
    const d = collect(); if (!showErrors(checks(d, true))) return;
    commit(sel, { ...d, capacity: Number(d.capacity) }, '공고 변경 내용을 저장했어요.', '내용 수정', diff(d) || '변경 없음');
  });
  on('#extend', async () => {
    const end = val('end');
    if (!end || end <= r.end) return showErrors([['end', `새 마감일은 현재 마감일(${fmtDate(r.end)})보다 늦어야 해요.`]]);
    clear();
    const ok = await confirmDialog({ title: '모집 기간을 연장할까요?', body: `<p class="lk-tabular">마감일 ${fmtDate(r.end)} → <b>${fmtDate(end)}</b></p><p>연장한 기간은 다시 줄일 수 없어요. 시작일과 다른 공고 항목은 바뀌지 않아요.</p>`, ok: '기간 연장' });
    if (ok) commit(sel, { end }, `마감일을 ${fmtDate(end)}로 연장했어요.`, '기간 연장', `마감일 ${fmtDate(r.end)} → ${fmtDate(end)}`);
  });
  on('#early-close', async () => {
    const ok = await confirmDialog({ title: '모집을 조기 마감할까요?', body: `<p><b>${esc(r.title)}</b></p><p>마감하면 다시 열 수 없고 새 지원을 받을 수 없어요. 이미 받은 지원서 심사는 계속할 수 있어요.</p>`, ok: '조기 마감', danger: true });
    if (ok) commit(sel, { earlyClosedAt: nowIso() }, '모집을 조기 마감했어요.', '조기 마감', '모집 중 → 마감');
  });
}
function on(sel, fn) { const el = $(sel); if (el) el.addEventListener('click', fn); }
function recField(k, value, ro, req, note, cls = '', type = 'text', label = REC_FIELDS[k]) {
  if (ro && type === 'date') { type = 'text'; value = fmtDate(value); }
  const marks = ro ? '<span class="opt">읽기 전용</span>' : `${req ? `<span class="req">${req}</span>` : ''}${note ? `<span class="opt">${note}</span>` : ''}`;
  return `<div class="lk-field ${cls}"><label class="lk-label" for="f-${k}">${label}${marks}</label>
    <input class="lk-input" id="f-${k}" type="${type}" value="${esc(value)}" aria-describedby="f-${k}-err" ${ro ? 'readonly' : ''} ${type === 'number' ? 'min="1" max="99" step="1"' : ''}>
    <p class="lk-error" id="f-${k}-err" hidden></p></div>`;
}
function recActions(r, st, locked, isNew) {
  if (st === '마감') return '<p class="lk-help">마감된 공고는 다시 열거나 수정할 수 없어요. 기존 지원서 심사는 지원자 관리에서 계속할 수 있어요.</p>';
  if (!r.published || isNew) return `<button type="button" class="lk-button lk-button--secondary" id="save-draft">초안 저장</button><button type="button" class="lk-button" id="publish" ${isNew ? 'disabled aria-describedby="publish-hint"' : ''}>공고 게시</button>`;
  if (locked) return `<button type="button" class="lk-button" id="extend">기간 연장</button>${st === '모집 중' ? '<button type="button" class="lk-button lk-button--secondary danger-outline" id="early-close">조기 마감</button>' : ''}`;
  return `<button type="button" class="lk-button" id="save-edit">변경 저장</button>${st === '모집 중' ? '<button type="button" class="lk-button lk-button--secondary danger-outline" id="early-close">조기 마감</button>' : ''}`;
}

// ---------- UI-06 지원자 심사 ----------
function viewReview(view, q) {
  const recs = Object.entries(S.recs).filter(([, r]) => r.lab === ADMIN_LAB && r.published);
  const head = '<div class="page-head"><h1 class="lk-title">지원자 관리</h1><p class="lk-description">상태 변경은 선택한 다음 단계와 확인창을 거쳐 저장돼요.</p></div>';
  if (!recs.length) {
    view.innerHTML = `${head}<div class="lk-panel lk-empty"><p class="lk-item-title">게시한 공고가 없어요.</p><p class="lk-description" style="margin:8px 0 16px">공고를 게시하면 지원자를 관리할 수 있어요.</p><a class="lk-button lk-button--secondary" href="#/admin/recruitments">모집 공고 관리</a></div>`;
    return;
  }
  // FR-06-08.2: 최초 진입은 공고 선택부터, 유효한 본인 공고 ID가 있으면 그 공고를 선택
  const recParam = q.get('rec');
  const rec = recParam && recs.some(([id]) => id === recParam) ? recParam : '';
  const filters = ['지원 완료', '검토 중', '면담', '합격', '불합격', '철회'];
  const filter = rec && filters.includes(q.get('filter')) ? q.get('filter') : '';
  const sel = q.get('app');
  const r = rec ? S.recs[rec] : null;
  const all = rec ? Object.entries(S.apps).filter(([, a]) => a.rec === rec) : [];
  const count = (f) => all.filter(([, a]) => appStatus(a) === f).length;
  // FR-06-08.3: 제출일 내림차순, 같은 시각은 접수 ID 내림차순
  const list = all.filter(([, a]) => !filter || appStatus(a) === filter).sort((x, y) => y[1].submittedAt.localeCompare(x[1].submittedAt) || y[0].localeCompare(x[0]));
  const cur = sel && list.some(([k]) => k === sel) ? S.apps[sel] : null;
  const link = (o) => { const p = new URLSearchParams({ rec, ...(filter ? { filter } : {}), ...o }); [...p.keys()].forEach((k) => !p.get(k) && p.delete(k)); return `#/admin/applicants?${p}`; };
  const passed = rec ? passedCount(rec) : 0;
  const day = (iso) => fmtDate(new Date(iso).toLocaleDateString('sv'));
  view.innerHTML = `${head}
    <div class="lk-panel" style="margin-bottom:24px"><div class="review-filters">
      <label class="lk-field"><span class="lk-label">공고 선택</span><select class="lk-input" id="rec-sel">${rec ? '' : '<option value="" selected>공고를 선택하세요</option>'}${recs.map(([id, x]) => `<option value="${id}" ${id === rec ? 'selected' : ''}>${esc(x.title)} · ${recStatus(x)}</option>`).join('')}</select></label>
      <label class="lk-field"><span class="lk-label">상태 필터</span><select class="lk-input" id="filter-sel" ${rec ? '' : 'disabled'}><option value="">전체 (${all.length})</option>${filters.map((f) => `<option value="${f}" ${f === filter ? 'selected' : ''}>${f} (${count(f)})</option>`).join('')}</select></label></div>
      ${r ? `<p class="capacity lk-tabular">모집기간 ${period(r)} · 합격 <b>${passed}</b>명 / 모집 인원 <b>${esc(r.capacity)}</b>명 · 남은 정원 <b>${Math.max(Number(r.capacity) - passed, 0)}</b>명 · 전체 지원 <b>${all.length}</b>건</p>` : ''}</div>
    ${!rec ? '<div class="lk-panel lk-empty"><p class="lk-item-title">공고를 선택하세요.</p><p class="lk-description" style="margin-top:8px">선택한 공고의 지원 목록과 정원 현황이 나와요.</p></div>' : `
    <div class="split split--list">
      <section class="lk-panel"><h2 class="lk-item-title" style="margin-bottom:12px">지원 목록 <span class="lk-caption">${filter ? `${esc(filter)} ${list.length}건 / 전체 ${all.length}건` : `${list.length}건`}</span></h2>
        ${list.length ? `<ul class="pick-list">${list.map(([k, a]) => { const s = appStatus(a); return s === '철회'
          ? `<li><a class="pick" href="${link({ app: k })}" aria-current="${k === sel}"><span class="pick__title"><span>접수 ${a.id}</span>${badge(s)}</span><span class="lk-caption lk-tabular">제출 ${day(a.submittedAt)}</span><span class="lk-caption lk-tabular">철회 ${day(a.history.at(-1)[1])}</span></a></li>`
          : `<li><a class="pick" href="${link({ app: k })}" aria-current="${k === sel}"><span class="pick__title"><span>${esc(a.student)}</span>${badge(s)}</span><span class="lk-caption">접수 ${a.id}</span><span class="lk-caption lk-tabular">제출 ${day(a.submittedAt)}</span></a></li>`; }).join('')}</ul>
          <p class="lk-caption" style="margin-top:12px">최신 제출순</p>`
          : all.length ? `<div class="stack"><p class="lk-description">‘${esc(filter)}’ 상태의 지원서가 없어요.</p><a class="lk-button lk-button--secondary" href="#/admin/applicants?rec=${rec}">필터 전체 보기</a></div>`
          : '<p class="lk-description">아직 이 공고에 지원한 학생이 없어요.</p>'}
      </section>
      <section class="lk-panel" id="rv-detail"></section>
    </div>`}`;
  $('#rec-sel').addEventListener('change', (e) => go(e.target.value ? `#/admin/applicants?rec=${e.target.value}` : '#/admin/applicants'));
  // FR-06-08.4: 상태 필터를 바꾸면 선택한 지원서를 해제한다 (공고를 바꾸면 필터도 전체로)
  const fs = $('#filter-sel');
  if (fs && rec) fs.addEventListener('change', (e) => { const p = new URLSearchParams({ rec }); if (e.target.value) p.set('filter', e.target.value); go(`#/admin/applicants?${p}`); });
  if (!rec) return;

  const box = $('#rv-detail');
  if (!cur) { box.innerHTML = `<p class="empty-detail">${list.length ? '목록에서 지원서를 선택하세요.' : '선택할 지원서가 없어요.'}</p>`; return; }
  const s = appStatus(cur);
  if (s === '철회') {
    box.innerHTML = `<div class="row"><h2 class="lk-item-title">접수 ${cur.id}</h2><span class="spacer"></span>${badge(s)}</div>
      <dl class="kv" style="margin-top:16px"><dt>제출일</dt><dd class="lk-tabular">${fmtDateTime(cur.submittedAt)}</dd><dt>철회일</dt><dd class="lk-tabular">${fmtDateTime(cur.history.at(-1)[1])}</dd></dl>
      <p class="lk-help" style="margin-top:16px">학생이 철회한 지원서는 접수번호와 날짜만 볼 수 있어요.</p>`;
    return;
  }
  const next = NEXT[s] || [];
  box.innerHTML = `
    <div class="row"><div><h2 class="lk-item-title">${esc(cur.student)}의 지원서</h2><p class="lk-caption">접수 ${cur.id} · 제출 당시 프로필</p></div><span class="spacer"></span>${badge(s)}</div>
    <section class="section"><h3>제출 내용</h3><dl class="kv"><dt>지원자</dt><dd>${esc(cur.student)} · ${esc(cur.dept || ME.dept)} · ${cur.year}학년</dd><dt>학교 이메일</dt><dd>${esc(cur.email || '')}</dd><dt>진학 희망</dt><dd>${esc(cur.course)}</dd><dt>첨부</dt><dd>${fileLinks(sel, cur)}</dd></dl><p class="quote" style="margin-top:8px">${esc(cur.intro)}</p></section>
    <section class="section"><h3>상태 이력</h3><ol class="history">${cur.history.map(([st, at]) => `<li><time>${fmtDateTime(at)}</time><span>${st}</span></li>`).join('')}</ol></section>
    <section class="section">${TERMINAL.includes(s) ? '<p class="lk-help">최종 결과가 확정된 지원서는 상태를 바꿀 수 없어요.</p>' : `
      <h3>다음 단계 선택</h3><div class="next-steps" role="group" aria-label="다음 단계">${next.map((n) => `<button type="button" class="lk-button" aria-pressed="false" data-next="${n}">${n === '검토 중' ? '검토 시작' : n}</button>`).join('')}</div>
      <p class="lk-error" id="rv-err" role="alert" hidden style="margin-top:12px"></p>
      <p class="lk-help" id="rv-hint" style="margin-top:12px">다음 단계를 먼저 선택하세요.</p>
      <div class="form-actions" style="justify-content:flex-end;margin-top:16px"><button type="button" class="lk-button" id="rv-confirm" disabled aria-describedby="rv-hint">변경 내용 확인</button></div>`}</section>`;
  let pick = null;
  const full = () => passedCount(rec) >= Number(S.recs[rec].capacity);
  const capacityError = (live) => {
    const others = (NEXT[live] || []).filter((x) => x !== '합격');
    const e = $('#rv-err');
    e.textContent = `모집 인원 ${S.recs[rec].capacity}명이 모두 합격 처리되어 더 합격시킬 수 없어요.${others.length ? ` ${others.join('·')} 처리는 할 수 있어요.` : ''}`;
    e.hidden = false;
  };
  $$('[data-next]').forEach((b) => b.addEventListener('click', () => {
    pick = b.dataset.next;
    $$('[data-next]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('#rv-confirm').disabled = false; $('#rv-hint').hidden = true;
    const e = $('#rv-err'); e.hidden = true; e.textContent = '';
  }));
  on('#rv-confirm', async () => {
    if (!pick) return;
    if (pick === '합격' && full()) return capacityError(s);
    const final = TERMINAL.includes(pick);
    const ok = await confirmDialog({ title: `${pick === '검토 중' ? '검토를 시작' : `'${pick}'(으)로 변경`}할까요?`, body: `<p><b>${esc(cur.student)}</b> · 접수 ${cur.id}</p><p>${s} → <b>${pick}</b></p><p>${final ? '최종 결과는 저장 후 되돌릴 수 없어요.' : '저장한 상태는 이전 단계로 되돌릴 수 없어요.'}</p>`, ok: '변경 저장' });
    if (!ok) return;
    const live = appStatus(S.apps[sel]);
    if (!(NEXT[live] || []).includes(pick)) { render(); toast('다른 곳에서 상태가 이미 바뀌었어요. 최신 상태를 확인하세요.', true); return; }
    if (pick === '합격' && full()) return capacityError(live); // 확정 순간에도 정원을 다시 검사한다 (FR-06-07)
    S.apps[sel].history.push([pick, nowIso()]); save();
    // FR-06-08.5: 바뀐 상태가 현재 필터에서 빠지면 선택을 해제한다
    const stays = !filter || filter === pick;
    go(stays ? link({ app: sel }) : link({}), { replace: true });
    toast(`${cur.student}의 지원 상태를 '${pick}'(으)로 저장했어요.`);
  });
}

render();
