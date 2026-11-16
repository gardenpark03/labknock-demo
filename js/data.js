/* LabKnock · 데이터와 업무 규칙
 * 실제 서버 대신 이 파일이 저장과 서버 쪽 검사(SRS 4장·6장·부록 B)를 맡는다.
 * 데이터는 이 브라우저의 localStorage에 저장되고, 모든 인물·연구실·공고는 가상이다. */
'use strict';

const STORE_KEY = 'labknock-site-v1';
const DEMO_PASSWORD = 'labknock-demo-2026';
const DEPT = '소프트웨어학과';
const SESSION_LIMIT_MS = 30 * 60 * 1000;   // FR-07-13 마지막 활동부터 30분
const VERIFY_TTL_MS = 30 * 60 * 1000;      // FR-07-03 확인 링크 30분
const RESEND_GAP_MS = 60 * 1000;           // FR-07-04 재발송 60초 간격
const LOGIN_LIMIT = 5;                     // NFR-06 연속 실패 5회
const BLOCK_MS = 15 * 60 * 1000;           // NFR-06 15분 제한
const SCHOOL_DOMAINS = ['skku.edu', 'g.skku.edu'];
const LATENCY = 350;                       // 서버 요청처럼 보이는 짧은 처리 시간

// ---------- 가상 초기 데이터 ----------
function seed() {
  const t = (d, h = '09:00:00') => new Date(`${d}T${h}+09:00`).toISOString();
  const user = (id, email, role, name, extra, hash) => ({
    id, email, role, name, department: null, grade: null, declaration: false,
    emailVerifiedAt: t('2026-11-01', '10:05:00'), createdAt: t('2026-11-01', '10:00:00'),
    assignedLabId: null, approvedReqId: null, pw: { salt: `seed-${id}`, hash }, failed: 0, blockedUntil: null, ...extra,
  });
  return {
    v: 1,
    seq: 102,   // 접수번호
    vseq: 2,    // 인증 요청 번호
    users: {
      U1: user('U1', 'student-a@g.skku.edu', 'student', '가상 학생', { department: DEPT, grade: 3, declaration: true }, '5ad63ff767c4ffaa694d7441813b7cdf403aac7e8634e426b059ebef4e6b24bb'),
      U2: user('U2', 'admin-a@skku.edu', 'admin', '가상 관리자', { assignedLabId: 'L1', approvedReqId: 'V1' }, 'b790fac439dca8fb8a4c72cdaac4129dec15af07d728dc967d000b081fdea470'),
      U3: user('U3', 'admin-b@skku.edu', 'admin', '가상 신청자', {}, 'ff345d7d88d0e931a2a286941b60d6870c2572f3c46b60360f38b917c56a738a'),
      U4: user('U4', 'ops@skku.edu', 'operator', '가상 운영 보조', { department: DEPT }, '08cc2778e5150fac14c77f519c97307fb73d30fb9020c2fb49eee6d018d5584e'),
    },
    labs: {
      L1: { name: '지능형시스템 연구실', professor: '김가상', dept: DEPT, fields: ['인공지능', '데이터 분석'], intro: '학습 기반 지능형 시스템과 모델 평가 방법을 연구합니다.' },
      L2: { name: '컴퓨팅시스템 연구실', professor: '이가상', dept: DEPT, fields: ['시스템', '운영체제'], intro: '운영체제와 시스템 소프트웨어의 성능·안정성을 연구합니다.' },
      L3: { name: '소프트웨어공학 연구실', professor: '박가상', dept: DEPT, fields: ['소프트웨어공학'], intro: '요구공학과 테스트 자동화를 연구합니다.' },
      L4: { name: '정보보호 연구실', professor: '최가상', dept: DEPT, fields: ['보안', '네트워크'], intro: '소프트웨어 취약점 분석과 네트워크 보안을 연구합니다.' },
      L5: { name: '인간컴퓨터상호작용 연구실', professor: '정가상', dept: DEPT, fields: ['HCI', '데이터 분석'], intro: '사용자 경험과 인터랙션 설계를 연구합니다.' },
      L6: { name: '데이터베이스 연구실', professor: '한가상', dept: DEPT, fields: ['데이터베이스', '데이터 분석'], intro: '대규모 데이터 저장·질의 처리 기술을 연구합니다.' },
    },
    recs: {
      R1: { lab: 'L1', title: '2026 겨울 학부연구생 모집', topic: '지능형 시스템 실험 및 모델 성능 비교', activity: '주 1회 연구 미팅 · 실험 결과 공유', skills: 'Python 기초와 협업 경험', capacity: 2, start: '2026-11-10', end: '2026-11-30', published: true, earlyClosedAt: null, savedAt: t('2026-11-09', '14:30:00'), log: [['초안 저장', t('2026-11-08', '16:20:00'), '', '가상 관리자'], ['게시', t('2026-11-09', '14:30:00'), '모집기간 2026.11.10 – 2026.11.30 · 2명', '가상 관리자']] },
      R2: { lab: 'L2', title: '시스템 소프트웨어 학부연구생', topic: '리눅스 커널 스케줄러 성능 분석', activity: '격주 세미나 · 실험 환경 구축 참여', skills: 'C 기초', capacity: 1, start: '2026-11-05', end: '2026-11-28', published: true, earlyClosedAt: null, savedAt: t('2026-11-04'), log: [['게시', t('2026-11-04'), '모집기간 2026.11.05 – 2026.11.28 · 1명', '이전 관리자']] },
      R3: { lab: 'L3', title: '테스트 자동화 연구 참여', topic: '테스트 케이스 자동 생성 도구 평가', activity: '주 1회 미팅 · 도구 실험', skills: 'Java 또는 Python', capacity: 2, start: '2026-12-01', end: '2026-12-14', published: true, earlyClosedAt: null, savedAt: t('2026-11-15'), log: [] },
      R4: { lab: 'L4', title: '보안 취약점 분석 학부연구생', topic: '오픈소스 취약점 재현과 분석', activity: '주 2회 스터디', skills: '리눅스 사용 경험', capacity: 1, start: '2026-10-01', end: '2026-11-08', published: true, earlyClosedAt: null, savedAt: t('2026-09-28'), log: [] },
      R5: { lab: 'L5', title: 'HCI 사용자 연구 보조', topic: '모바일 앱 사용성 평가', activity: '사용자 인터뷰 · 데이터 정리', skills: '', capacity: 3, start: '2026-11-12', end: '2026-11-29', published: true, earlyClosedAt: null, savedAt: t('2026-11-11'), log: [] },
      R6: { lab: 'L1', title: '2027 봄 학부연구생 모집', topic: '', activity: '', skills: '', capacity: '', start: '', end: '', published: false, earlyClosedAt: null, savedAt: t('2026-11-14', '10:12:40'), log: [['초안 저장', t('2026-11-14', '10:12:40'), '', '가상 관리자']] },
      R7: { lab: 'L6', title: '데이터 시스템 학부연구생', topic: '질의 최적화 실험', activity: '주 1회 미팅', skills: 'SQL 기초', capacity: 2, start: '2026-11-01', end: '2026-12-05', published: true, earlyClosedAt: null, savedAt: t('2026-10-30'), log: [] },
    },
    apps: {
      A0097: { id: 'A-0097', rec: 'R1', studentId: null, student: '가상 학생 E', email: 'student-e@g.skku.edu', dept: DEPT, year: 4, sample: true, intro: '데이터 분석 동아리에서 시각화 프로젝트를 진행했습니다.', course: '석사', files: ['CV.pdf'], submittedAt: t('2026-11-11', '10:20:00'), history: [['지원 완료', t('2026-11-11', '10:20:00')], ['검토 중', t('2026-11-12', '09:10:00')], ['합격', t('2026-11-14', '16:00:00')]] },
      A0098: { id: 'A-0098', rec: 'R1', studentId: null, student: '가상 학생 B', email: 'student-b@g.skku.edu', dept: DEPT, year: 3, sample: true, intro: '머신러닝 수업 프로젝트로 이미지 분류 모델을 만들었습니다.', course: '학석연계', files: ['CV.pdf', '성적증명서.pdf'], submittedAt: t('2026-11-12', '13:05:00'), history: [['지원 완료', t('2026-11-12', '13:05:00')], ['검토 중', t('2026-11-13', '11:00:00')]] },
      A0099: { id: 'A-0099', rec: 'R1', studentId: null, student: '가상 학생 C', email: 'student-c@g.skku.edu', dept: DEPT, year: 2, sample: true, intro: '파이썬으로 실험 자동화 스크립트를 작성한 경험이 있습니다.', course: '미정', files: ['CV.pdf'], submittedAt: t('2026-11-13', '18:40:00'), history: [['지원 완료', t('2026-11-13', '18:40:00')], ['검토 중', t('2026-11-14', '10:00:00')], ['면담', t('2026-11-15', '15:20:00')]] },
      A0100: { id: 'A-0100', rec: 'R1', studentId: null, student: '가상 학생 D', email: 'student-d@g.skku.edu', dept: DEPT, year: 3, sample: true, intro: '', course: '', files: [], submittedAt: t('2026-11-14', '09:30:00'), history: [['지원 완료', t('2026-11-14', '09:30:00')], ['철회', t('2026-11-15', '08:10:00')]] },
      A0102: { id: 'A-0102', rec: 'R2', studentId: 'U1', student: '가상 학생', email: 'student-a@g.skku.edu', dept: DEPT, year: 3, sample: true, intro: '운영체제 수업에서 스케줄러 과제를 구현하며 시스템 소프트웨어에 관심을 갖게 되었습니다.', course: '석사', files: ['CV.pdf'], submittedAt: t('2026-11-15', '21:00:00'), history: [['지원 완료', t('2026-11-15', '21:00:00')], ['검토 중', t('2026-11-16', '09:30:00')]] },
    },
    vreqs: {
      V1: { id: 'V1', requesterId: 'U2', nameSnapshot: '가상 관리자', labId: 'L1', description: '지능형시스템 연구실 박사과정이며, 지도교수님께 학부연구생 모집 공고와 지원자 관리를 위임받았습니다.', proof: '위임확인서.pdf', sample: 'assets/samples/sample-proof-l1.pdf', status: '승인', requestedAt: t('2026-11-02', '14:10:00'), reviewedBy: 'U4', reviewedAt: t('2026-11-03', '10:30:00'), rejectionReason: '', previousRequestId: null },
      V2: { id: 'V2', requesterId: 'U3', nameSnapshot: '가상 신청자', labId: 'L2', description: '컴퓨팅시스템 연구실 석사과정이며, 지도교수님께 학부연구생 모집 공고 관리를 위임받았습니다.', proof: '소속확인서.pdf', sample: 'assets/samples/sample-proof-l2.pdf', status: '승인 대기', requestedAt: t('2026-11-15', '11:02:31'), reviewedBy: null, reviewedAt: null, rejectionReason: '', previousRequestId: null },
    },
    verifs: {},   // EmailVerification (6.2.8)
    mail: [],     // 가상 메일함 (실제 메일 대신)
    session: null,
  };
}

// ---------- 저장소 ----------
let S = load();
function load() {
  try { const x = JSON.parse(localStorage.getItem(STORE_KEY)); if (x && x.v === 1 && x.users) return x; } catch { /* 저장 불가 환경 */ }
  return seed();
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch { /* 저장 불가 환경 */ } }
async function resetAll() {
  try { localStorage.removeItem(STORE_KEY); sessionStorage.removeItem('labknock-demo-v3'); } catch { /* 무시 */ }
  await FileStore.clear();
  S = seed(); save();
}

// ---------- 공고·지원 규칙 (부록 B.1·B.2) ----------
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
const STATUS_ORDER = { '모집 중': 0, '모집 예정': 1, '마감': 2 };
const badgeClass = (s) => ({ '작성 중': 'neutral', '마감': 'neutral', '불합격': 'neutral', '철회': 'neutral', '반려': 'neutral', '면담': 'warning', '승인 대기': 'warning', '미확인': 'warning', '합격': 'success', '승인': 'success', '확인 완료': 'success', '확인함': 'success', '신청 전': 'neutral' }[s] || '');
const badge = (s) => `<span class="lk-badge ${badgeClass(s) ? 'lk-badge--' + badgeClass(s) : ''}">${esc(s)}</span>`;
const period = (r) => (r.start ? `${fmtDate(r.start)} – ${fmtDate(r.end)}` : '미정');
const appsOf = (recId) => Object.values(S.apps).filter((a) => a.rec === recId);
const passedCount = (recId) => appsOf(recId).filter((a) => appStatus(a) === '합격').length;
const myAppFor = (u, recId) => (u ? Object.values(S.apps).find((a) => a.studentId === u.id && a.rec === recId) : null);
// 지원 현황의 상태 의미 (SRS 2.6)
const STATUS_NOTE = {
  '지원 완료': '제출이 완료됐어요. 연구실이 검토를 시작하면 상태가 바뀌어요.',
  '검토 중': '연구실이 지원서를 검토하고 있어요.',
  '면담': '연구실이 면담 단계로 진행했어요. 면담 일정은 연구실이 따로 안내해요.',
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

// ---------- 계정·세션 (4.7, 6.2.1) ----------
const normEmail = (e) => String(e ?? '').trim().replace(/[A-Z]/g, (c) => c.toLowerCase()); // ASCII 대소문자만 무시 (FR-07-02)
const emailDomainOk = (e) => { const m = /^[^\s@]+@([^\s@]+)$/.exec(e); return !!m && SCHOOL_DOMAINS.includes(m[1]); };
const findUserByEmail = (e) => Object.values(S.users).find((u) => u.email === e);
const hashPw = (salt, pw) => sha256Hex(`${salt}:${pw}`);
let sessionNotice = '';   // 만료 안내 (로그인 화면에서 한 번 보여 준다)

function currentUser() {
  const s = S.session;
  if (!s) return null;
  const u = S.users[s.userId];
  if (!u) { S.session = null; save(); return null; }
  // 만료 여부를 갱신보다 먼저 검사한다 (FR-07-13.3)
  if (Date.now() - new Date(s.lastActiveAt).getTime() >= SESSION_LIMIT_MS) {
    S.session = null; save();
    sessionNotice = '30분 동안 활동이 없어 로그아웃됐어요. 다시 로그인해주세요.';
    return null;
  }
  return u;
}
// 보호된 화면 조회·변경이 성공했을 때만 활동 시각을 갱신한다 (4.7.2)
// 다른 탭의 변경으로 다시 그리는 것은 사용자 활동이 아니므로 갱신하지 않는다
let bgRender = false;
function touch() {
  if (bgRender || !S.session) return;
  // 이미 만료된 세션은 늦게 끝난 요청으로 되살리지 않는다 (FR-07-13.3)
  if (Date.now() - new Date(S.session.lastActiveAt).getTime() >= SESSION_LIMIT_MS) return;
  const now = nowIso();
  if (now > S.session.lastActiveAt) { S.session.lastActiveAt = now; save(); }
}
function startSession(u) { const now = nowIso(); S.session = { userId: u.id, startedAt: now, lastActiveAt: now }; }
const isAdmin = (u) => !!u && u.role === 'admin';
// 승인된 관리자: 배정 연구실과 승인 요청(본인·승인·같은 연구실)이 서로 맞아야 한다 (FR-07-10.3, 6.2.1)
const isApprovedAdmin = (u) => {
  if (!isAdmin(u) || !u.assignedLabId) return false;
  const r = S.vreqs[u.approvedReqId];
  return !!r && r.status === '승인' && r.requesterId === u.id && r.labId === u.assignedLabId;
};
const roleLabel = (u) => (u.role === 'student' ? '학생' : u.role === 'operator' ? '운영 보조' : isApprovedAdmin(u) ? '연구실 관리자' : '관리자 신청자');
// 확인창이나 처리 대기 뒤에도 같은 사람이 로그인해 있는지 다시 확인한다 (FR-07-13.3)
const sameUser = (u) => { const me = currentUser(); return me && u && me.id === u.id ? me : null; };
const profileComplete = (u) => u.role !== 'student' || (chars(u.name) >= 1 && [1, 2, 3, 4].includes(Number(u.grade)) && u.declaration === true);
const homeOf = (u) => (!u || u.role === 'student' ? '#/labs' : u.role === 'operator' ? '#/ops/verifications' : '#/admin/recruitments');
// FR-07-13·3.1.8: 로그인·이메일 확인·프로필 보완 뒤 돌아갈 수 있는 내부 목적지만 허용한다
// 이메일 확인 링크는 로그인 뒤 그 링크를 이어서 처리하려고 예외로 허용한다
const RETURN_OK = /^#\/(lab\/L\d+\/R\d+(\?back=[\w%.~*'()!=&+-]*)?|apply\/R\d+|my(\?app=A\d+)?|verify-email\?token=[0-9a-f]{32})$/;
const safeReturn = (h) => (h && RETURN_OK.test(h) ? h : '');

const verifsOf = (u) => Object.values(S.verifs).filter((v) => v.userId === u.id).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
const mailOf = (u) => S.mail.filter((m) => m.to === u.email);
const vreqsOf = (u) => Object.values(S.vreqs).filter((r) => r.requesterId === u.id).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
const pendingReqOf = (u) => vreqsOf(u).find((r) => r.status === '승인 대기') || null;

// 새 확인 링크 발급: 60초 간격 검사·이전 링크 무효화·발급 기록을 함께 확정한다 (FR-07-04)
function issueVerification(u, kind = 'signup') {
  const now = Date.now();
  const latest = verifsOf(u)[0];
  if (latest && now - new Date(latest.issuedAt).getTime() < RESEND_GAP_MS) {
    return { ok: false, waitMs: RESEND_GAP_MS - (now - new Date(latest.issuedAt).getTime()) };
  }
  const at = new Date(now).toISOString();
  verifsOf(u).forEach((v) => { if (!v.usedAt && !v.supersededAt) v.supersededAt = at; });
  const token = randomHex(16);
  const id = `EV${Object.keys(S.verifs).length + 1}`;
  const expiresAt = new Date(now + VERIFY_TTL_MS).toISOString();
  S.verifs[id] = { id, userId: u.id, email: u.email, tokenHash: sha256Hex(token), issuedAt: at, expiresAt, sentAt: at, usedAt: null, supersededAt: null };
  // 외부 메일 전달 대신 가상 메일함에 넣는다 (토큰 원문은 메일 본문에만 있고 저장소의 검증값은 해시다)
  S.mail.unshift({ id: `M${S.mail.length + 1}`, kind, to: u.email, subject: kind === 'resend' ? '[랩노크] 학교 이메일 확인 메일을 다시 보내드려요' : '[랩노크] 학교 이메일을 확인해주세요', sentAt: at, expiresAt, link: `#/verify-email?token=${token}` });
  save();
  return { ok: true, issuedAt: at };
}
function nextResendInMs(u) {
  const latest = verifsOf(u)[0];
  if (!latest) return 0;
  return Math.max(0, RESEND_GAP_MS - (Date.now() - new Date(latest.issuedAt).getTime()));
}

// ---------- 서버 역할을 하는 요청 함수 ----------
// 성공: { ok: true, ... } / 입력 오류: { ok: false, errors: [[칸, 문구]] } / 거절: { ok: false, message }
const api = {
  async signup({ email, password, password2, role }) {
    const errors = [];
    const e = normEmail(email);
    if (!['student', 'admin'].includes(role)) errors.push(['role', '가입 유형을 선택해주세요.']);
    if (!e) errors.push(['email', '학교 이메일을 입력해주세요.']);
    else if (!emailDomainOk(e)) errors.push(['email', 'skku.edu 또는 g.skku.edu로 끝나는 학교 이메일만 가입할 수 있어요.']);
    const n = rawChars(password);
    if (n < 12 || n > 128) errors.push(['password', '비밀번호는 12~128자로 입력해주세요.']);
    if (!password2) errors.push(['password2', '비밀번호를 한 번 더 입력해주세요.']);
    else if (password !== password2) errors.push(['password2', '비밀번호가 서로 달라요. 다시 확인해주세요.']);
    if (errors.length) return { ok: false, errors };
    await sleep(LATENCY);
    if (findUserByEmail(e)) return { ok: false, errors: [['email', '이미 가입된 이메일이에요. 로그인하거나 다른 주소를 입력해주세요.']] };
    let i = Object.keys(S.users).length + 1; while (S.users[`U${i}`]) i += 1;
    const id = `U${i}`;
    const salt = randomHex(8);
    const u = { id, email: e, role, name: '', department: role === 'student' ? DEPT : null, grade: null, declaration: false, emailVerifiedAt: null, createdAt: nowIso(), assignedLabId: null, approvedReqId: null, pw: { salt, hash: hashPw(salt, password) }, failed: 0, blockedUntil: null };
    S.users[id] = u;
    startSession(u);
    issueVerification(u);
    save();
    return { ok: true, user: u };
  },

  async login({ email, password }) {
    const e = normEmail(email);
    const errors = [];
    if (!e) errors.push(['email', '학교 이메일을 입력해주세요.']);
    if (!password) errors.push(['password', '비밀번호를 입력해주세요.']);
    if (errors.length) return { ok: false, errors };
    await sleep(LATENCY);
    // 실패 문구는 계정이 있는지 구별하지 않는다 (NFR-06)
    const generic = '로그인할 수 없어요. 이메일과 비밀번호를 확인해주세요. 5번 연속 틀리면 15분 동안 로그인이 제한돼요.';
    const u = findUserByEmail(e);
    if (!u) return { ok: false, message: generic };
    const now = Date.now();
    if (u.blockedUntil && now < new Date(u.blockedUntil).getTime()) return { ok: false, message: generic };
    if (u.blockedUntil) { u.blockedUntil = null; u.failed = 0; }   // 제한 종료 경계부터 다시 시도
    if (hashPw(u.pw.salt, password) !== u.pw.hash) {
      u.failed += 1;
      if (u.failed >= LOGIN_LIMIT) u.blockedUntil = new Date(now + BLOCK_MS).toISOString();
      save();
      return { ok: false, message: generic };
    }
    u.failed = 0; u.blockedUntil = null;
    startSession(u); save();
    return { ok: true, user: u };
  },

  logout() { S.session = null; save(); },

  async resendVerification() {
    const u = currentUser();
    if (!u) return { ok: false, message: '로그인이 필요해요.' };
    if (u.emailVerifiedAt) return { ok: false, message: '이미 확인한 이메일이에요.' };
    await sleep(LATENCY);
    const me = sameUser(u);
    if (!me) return { ok: false, message: '로그인 상태가 바뀌었어요. 다시 확인해주세요.' };
    if (me.emailVerifiedAt) return { ok: false, message: '이미 확인한 이메일이에요.' };
    const r = issueVerification(me, 'resend');
    if (!r.ok) return { ok: false, message: `새 확인 메일은 ${Math.ceil(r.waitMs / 1000)}초 뒤에 보낼 수 있어요.` };
    touch();
    return r;
  },

  // 로그인 계정과 주소가 일치하는 최신·미사용·미만료 링크만 확인 완료로 처리한다 (FR-07-03)
  verifyEmail(token) {
    const u = currentUser();
    if (!u) return { ok: false, code: 'login' };
    const h = sha256Hex(String(token || ''));
    const v = Object.values(S.verifs).find((x) => x.tokenHash === h);
    if (!v) return { ok: false, code: 'invalid' };
    if (v.userId !== u.id || v.email !== u.email) return { ok: false, code: 'other' };
    if (v.usedAt) return { ok: false, code: 'used' };
    if (v.supersededAt) return { ok: false, code: 'superseded' };
    if (Date.now() >= new Date(v.expiresAt).getTime()) return { ok: false, code: 'expired' };
    const at = nowIso();
    v.usedAt = at; u.emailVerifiedAt = at;
    touch(); save();
    return { ok: true };
  },

  // 역할별 프로필 보완·수정 (4.7.1, FR-07-05·06)
  async saveProfile({ name, grade, declaration }) {
    const u = currentUser();
    if (!u) return { ok: false, message: '로그인이 필요해요.' };
    if (u.role === 'operator') return { ok: false, message: '운영 보조 계정은 프로필을 수정할 수 없어요.' };
    const errors = [];
    const nm = clean(name);
    if (chars(nm) < 1) errors.push(['name', '이름을 입력해주세요.']);
    else if (chars(nm) > 50) errors.push(['name', '이름은 50자 이하로 입력해주세요.']);
    if (u.role === 'student') {
      if (![1, 2, 3, 4].includes(Number(grade))) errors.push(['grade', '학년을 선택해주세요.']);
      if (!u.declaration && declaration !== true) errors.push(['declaration', '프로필을 완성하려면 소프트웨어학과 학부생인지 확인해주세요.']);
    }
    if (errors.length) return { ok: false, errors };
    await sleep(LATENCY);
    // 처리 중 다른 탭이 저장했을 수 있으므로 현재 저장소에서 다시 읽어 반영한다
    const me = sameUser(u);
    if (!me) return { ok: false, message: '로그인 상태가 바뀌어 저장하지 못했어요. 다시 로그인해주세요.' };
    me.name = nm;
    if (me.role === 'student') { me.grade = Number(grade); if (!me.declaration) { me.declaration = true; me.department = DEPT; } }
    touch(); save();
    return { ok: true };
  },

  // 연구실 인증 신청 (FR-07-08, 4.7.3)
  async requestVerification({ confirmedName, labId, description, file }) {
    const u = currentUser();
    if (!isAdmin(u)) return { ok: false, message: '관리자 신청 계정만 연구실 인증을 신청할 수 있어요.' };
    if (!u.emailVerifiedAt) return { ok: false, message: '학교 이메일을 먼저 확인해주세요.' };
    if (u.assignedLabId) return { ok: false, message: '이미 연구실이 배정된 계정이에요. 다른 연구실 추가 신청이나 배정 변경은 할 수 없어요.' };
    if (pendingReqOf(u)) return { ok: false, message: '승인 대기 중인 요청이 있어요. 검토가 끝날 때까지 수정하거나 새로 신청할 수 없어요.' };
    const errors = [];
    if (!chars(u.name)) errors.push(['name', '내 정보에서 본인 이름을 먼저 입력해주세요.']);
    const lab = S.labs[labId];
    if (!lab) errors.push(['lab', '대상 연구실을 선택해주세요.']);
    const n = chars(clean(description));
    if (n < 1) errors.push(['desc', '소속 설명을 입력해주세요.']);
    else if (n > 500) errors.push(['desc', '소속 설명은 500자 이하로 줄여주세요.']);
    if (!file) errors.push(['proof', '위임 근거 PDF를 선택해주세요.']);
    else if (!/\.pdf$/i.test(file.name) || file.size < 1 || file.size > 5_000_000) errors.push(['proof', '위임 근거는 5MB 이하의 PDF 파일이어야 해요.']);
    if (errors.length) return { ok: false, errors };
    await sleep(LATENCY);
    const fileKey = randomHex(8);
    await FileStore.put(`file:${fileKey}`, file);
    // 대기·파일 보관이 끝난 뒤 현재 저장소 기준으로 다시 검사하고 한 번에 확정한다
    const me = sameUser(u);
    if (!me || !isAdmin(me)) return { ok: false, message: '로그인 상태가 바뀌어 신청하지 못했어요. 다시 로그인해주세요.' };
    // 확정 직전에 이름이 바뀌었으면 최신 이름을 보여 주고 다시 확인받는다 (FR-07-08.3)
    if (confirmedName !== me.name) return { ok: false, code: 'name-changed', latestName: me.name };
    if (!me.emailVerifiedAt || pendingReqOf(me) || me.assignedLabId) return { ok: false, message: '요청 상태가 바뀌었어요. 최신 상태를 확인해주세요.' };
    S.vseq += 1;
    const id = `V${S.vseq}`;
    const prev = vreqsOf(me)[0];
    S.vreqs[id] = { id, requesterId: me.id, nameSnapshot: me.name, labId, description: clean(description), proof: file.name, fileKey, sample: null, status: '승인 대기', requestedAt: nowIso(), reviewedBy: null, reviewedAt: null, rejectionReason: '', previousRequestId: prev && prev.status === '반려' ? prev.id : null };
    touch(); save();
    return { ok: true, id };
  },

  // 운영 보조의 승인·반려 (FR-07-09~12)
  async decideVerification(id, decision, reason) {
    const u = currentUser();
    if (!u || u.role !== 'operator') return { ok: false, message: '운영 보조 계정만 판정할 수 있어요.' };
    const r = S.vreqs[id];
    const lab = r && S.labs[r.labId];
    if (!r || !lab || lab.dept !== u.department) return { ok: false, message: '검토할 수 없는 요청이에요.' };
    if (decision === 'reject') {
      const n = chars(clean(reason));
      if (n < 1) return { ok: false, errors: [['reason', '반려 사유를 입력해주세요. 신청자가 무엇을 보완할지 알 수 있게 적어주세요.']] };
      if (n > 500) return { ok: false, errors: [['reason', '반려 사유는 500자 이하로 줄여주세요.']] };
    }
    await sleep(LATENCY);
    // 판정 경쟁: 대기 뒤 현재 저장소의 요청 상태로 다시 검사해 먼저 확정된 판정 하나만 적용한다 (FR-07-12)
    const me = sameUser(u);
    if (!me || me.role !== 'operator') return { ok: false, message: '로그인 상태가 바뀌어 판정하지 못했어요. 다시 로그인해주세요.' };
    const cur = S.vreqs[id];
    const curLab = cur && S.labs[cur.labId];
    if (!cur || !curLab || curLab.dept !== me.department) return { ok: false, message: '검토할 수 없는 요청이에요.' };
    if (cur.status !== '승인 대기') return { ok: false, code: 'race', message: '이미 다른 판정이 저장된 요청이에요. 최신 결과를 확인하세요.' };
    const at = nowIso();
    if (decision === 'approve') {
      const requester = S.users[cur.requesterId];
      if (!requester || requester.role !== 'admin' || !requester.emailVerifiedAt || requester.assignedLabId) {
        return { ok: false, message: '승인 조건을 충족하지 않아요. 신청자가 이메일 확인된 미배정 관리자인지 확인하세요.' };
      }
      Object.assign(cur, { status: '승인', reviewedBy: me.id, reviewedAt: at });
      requester.assignedLabId = cur.labId; requester.approvedReqId = cur.id;   // 판정과 배정을 함께 확정한다 (FR-07-10.3)
    } else {
      Object.assign(cur, { status: '반려', reviewedBy: me.id, reviewedAt: at, rejectionReason: clean(reason) });
    }
    touch(); save();
    return { ok: true };
  },
};
