-- LabKnock · 스키마, 권한, 업무 규칙 (SRS v1.3 4·6장, 부록 B)
-- 모든 테이블은 RLS를 켜고 정책을 두지 않는다. 브라우저는 아래 security definer 함수(RPC)로만 읽고 쓴다.
-- 함수가 로그인 사용자(auth.uid())와 역할을 확인하고, 화면과 같은 규칙을 서버에서 다시 검사한다.

create extension if not exists pgcrypto with schema extensions;

-- ---------- 테이블 ----------
create table public.labs (
  id text primary key,
  name text not null,
  professor text not null,
  dept text not null,
  fields text[] not null default '{}',
  intro text not null default ''
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('student', 'admin', 'operator')),
  name text not null default '',
  department text,
  grade int check (grade between 1 and 4),
  declaration boolean not null default false,
  assigned_lab_id text references public.labs (id),
  approved_req_id text,
  created_at timestamptz not null default now(),
  failed int not null default 0,          -- NFR-06 연속 로그인 실패
  blocked_until timestamptz
);

create table public.recs (
  id text primary key,
  lab_id text not null references public.labs (id),
  title text not null,
  topic text not null default '',
  activity text not null default '',
  skills text not null default '',
  capacity int check (capacity between 1 and 99),
  start_date date,
  end_date date,
  published boolean not null default false,
  early_closed_at timestamptz,
  saved_at timestamptz not null default now(),
  log jsonb not null default '[]'          -- [[종류, 시각, 변경 내용, 처리자], ...] (FR-05-07)
);

create table public.apps (
  key text primary key,                    -- 화면 주소용 키 (예: A0102)
  id text not null unique,                 -- 접수번호 (예: A-0102)
  rec_id text not null references public.recs (id),
  student_id uuid references public.profiles (id) on delete set null,
  student text not null,                   -- 제출 당시 프로필 (6.2.4)
  email text not null,
  dept text,
  year int,
  sample boolean not null default false,
  file_key text,
  intro text not null default '',
  course text not null default '',
  files jsonb not null default '[]',
  submitted_at timestamptz not null default now(),
  history jsonb not null default '[]',     -- [[상태, 시각], ...]
  unique (rec_id, student_id)              -- 같은 공고에는 한 번만 지원 (FR-03)
);

create table public.vreqs (
  id text primary key,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  name_snapshot text not null,
  lab_id text not null references public.labs (id),
  description text not null,
  proof text not null,
  file_key text,
  sample text,
  status text not null check (status in ('승인 대기', '승인', '반려')),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  rejection_reason text not null default '',
  previous_request_id text
);
-- 한 사람에게 승인 대기 요청은 하나만 (4.7.3)
create unique index vreqs_one_pending on public.vreqs (requester_id) where status = '승인 대기';

create sequence public.app_seq start 103;
create sequence public.vreq_seq start 3;

alter table public.labs enable row level security;
alter table public.profiles enable row level security;
alter table public.recs enable row level security;
alter table public.apps enable row level security;
alter table public.vreqs enable row level security;
revoke all on public.labs, public.profiles, public.recs, public.apps, public.vreqs from anon, authenticated;

-- ---------- 공통 도구 ----------
create or replace function public.iso(t timestamptz) returns text
language sql immutable as $$ select to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') $$;

create or replace function public.chars(t text) returns int
language sql immutable as $$ select char_length(coalesce(normalize(t, NFC), '')) $$;

-- 공고 상태 (부록 B.1): 날짜 경계는 한국 시간 기준
create or replace function public.rec_status(r public.recs) returns text
language sql stable as $$
  select case
    when not r.published then '작성 중'
    when r.early_closed_at is not null then '마감'
    when now() >= ((r.end_date + 1)::timestamp at time zone 'Asia/Seoul') then '마감'
    when now() < (r.start_date::timestamp at time zone 'Asia/Seoul') then '모집 예정'
    else '모집 중' end
$$;

create or replace function public.app_status(a public.apps) returns text
language sql immutable as $$ select a.history -> -1 ->> 0 $$;

create or replace function public.me() returns public.profiles
language sql stable security definer set search_path = public as $$
  select * from public.profiles where id = auth.uid()
$$;

-- 승인된 관리자: 배정 연구실과 승인 요청이 서로 맞아야 한다 (FR-07-10.3)
create or replace function public.is_approved_admin(p public.profiles) returns boolean
language sql stable security definer set search_path = public as $$
  select p.role = 'admin' and p.assigned_lab_id is not null and exists (
    select 1 from public.vreqs v
    where v.id = p.approved_req_id and v.status = '승인' and v.requester_id = p.id and v.lab_id = p.assigned_lab_id)
$$;

create or replace function public.email_verified(uid uuid) returns timestamptz
language sql stable security definer set search_path = public, auth as $$
  select email_confirmed_at from auth.users where id = uid
$$;

create or replace function public.profile_json(p public.profiles) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'email', p.email, 'role', p.role, 'name', p.name, 'department', p.department,
    'grade', p.grade, 'declaration', p.declaration, 'emailVerifiedAt', public.iso(public.email_verified(p.id)),
    'createdAt', public.iso(p.created_at), 'assignedLabId', p.assigned_lab_id, 'approvedReqId', p.approved_req_id)
$$;

create or replace function public.rec_json(r public.recs) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'lab', r.lab_id, 'title', r.title, 'topic', r.topic, 'activity', r.activity, 'skills', r.skills,
    'capacity', coalesce(to_jsonb(r.capacity), '""'::jsonb),
    'start', coalesce(r.start_date::text, ''), 'end', coalesce(r.end_date::text, ''),
    'published', r.published, 'earlyClosedAt', public.iso(r.early_closed_at), 'savedAt', public.iso(r.saved_at), 'log', r.log)
$$;

create or replace function public.app_json(a public.apps) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'id', a.id, 'rec', a.rec_id, 'studentId', a.student_id, 'student', a.student, 'email', a.email, 'dept', a.dept,
    'year', a.year, 'sample', a.sample, 'fileKey', a.file_key, 'intro', a.intro, 'course', a.course, 'files', a.files,
    'submittedAt', public.iso(a.submitted_at), 'history', a.history)
$$;

create or replace function public.vreq_json(v public.vreqs) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'id', v.id, 'requesterId', v.requester_id, 'nameSnapshot', v.name_snapshot, 'labId', v.lab_id,
    'description', v.description, 'proof', v.proof, 'fileKey', v.file_key, 'sample', v.sample, 'status', v.status,
    'requestedAt', public.iso(v.requested_at), 'reviewedBy', v.reviewed_by, 'reviewedAt', public.iso(v.reviewed_at),
    'rejectionReason', v.rejection_reason, 'previousRequestId', v.previous_request_id)
$$;

-- ---------- 가입: 학교 이메일만, 역할은 학생·관리자 신청자만 (FR-07-01·02) ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r text := coalesce(new.raw_user_meta_data ->> 'role', '');
  dom text := lower(split_part(new.email, '@', 2));
begin
  if dom not in ('skku.edu', 'g.skku.edu') then
    raise exception 'school_email_only' using errcode = 'P0001';
  end if;
  if r not in ('student', 'admin') then r := 'student'; end if;   -- 운영 보조는 가입으로 만들 수 없다
  insert into public.profiles (id, email, role, department)
  values (new.id, lower(new.email), r, case when r = 'student' then '소프트웨어학과' end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 화면 데이터: 로그인 역할이 볼 수 있는 것만 ----------
create or replace function public.get_state() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  p public.profiles := public.me();
  approved boolean := p.id is not null and public.is_approved_admin(p);
  out jsonb;
begin
  select jsonb_build_object(
    'me', p.id,
    'labs', coalesce((select jsonb_object_agg(l.id, jsonb_build_object('name', l.name, 'professor', l.professor, 'dept', l.dept, 'fields', to_jsonb(l.fields), 'intro', l.intro)) from public.labs l), '{}'),
    'recs', coalesce((select jsonb_object_agg(r.id, public.rec_json(r)) from public.recs r
              where r.published or (approved and r.lab_id = p.assigned_lab_id)), '{}'),
    'apps', coalesce((select jsonb_object_agg(a.key, public.app_json(a)) from public.apps a join public.recs r on r.id = a.rec_id
              where (p.role = 'student' and a.student_id = p.id)
                 or (approved and r.lab_id = p.assigned_lab_id)), '{}'),
    'vreqs', coalesce((select jsonb_object_agg(v.id, public.vreq_json(v)) from public.vreqs v join public.labs l on l.id = v.lab_id
              where v.requester_id = p.id or (p.role = 'operator' and l.dept = p.department)), '{}'),
    'users', coalesce((select jsonb_object_agg(u.id, public.profile_json(u)) from public.profiles u
              where u.id = p.id or (p.role = 'operator' and u.id in (
                select v.requester_id from public.vreqs v join public.labs l on l.id = v.lab_id where l.dept = p.department
                union select v.reviewed_by from public.vreqs v join public.labs l on l.id = v.lab_id where l.dept = p.department))), '{}'),
    'demo', (select coalesce(jsonb_agg(jsonb_build_object('email', d.email, 'role', d.role, 'approved', public.is_approved_admin(d),
              'name', d.name, 'department', d.department, 'grade', d.grade,
              'lab', (select l.name from public.labs l where l.id = coalesce(d.assigned_lab_id,
                       (select v.lab_id from public.vreqs v where v.requester_id = d.id order by v.requested_at desc limit 1)))) order by d.email), '[]')
              from public.profiles d where d.email in ('student-a@g.skku.edu', 'admin-a@skku.edu', 'admin-b@skku.edu', 'ops@skku.edu'))
  ) into out;
  return out;
end $$;

-- ---------- 로그인 제한 (NFR-06): 연속 5회 실패 시 15분 ----------
create or replace function public.login_attempt(p_email text, p_password text) returns jsonb
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  u auth.users;
  p public.profiles;
begin
  select * into u from auth.users where email = lower(trim(p_email));
  if u.id is null then return jsonb_build_object('ok', false, 'code', 'wrong'); end if;
  select * into p from public.profiles where id = u.id for update;
  if p.blocked_until is not null and now() < p.blocked_until then
    return jsonb_build_object('ok', false, 'code', 'blocked');
  end if;
  if p.blocked_until is not null then update public.profiles set blocked_until = null, failed = 0 where id = u.id; p.failed := 0; end if;
  if u.encrypted_password is null or crypt(p_password, u.encrypted_password) <> u.encrypted_password then
    update public.profiles set failed = p.failed + 1,
      blocked_until = case when p.failed + 1 >= 5 then now() + interval '15 minutes' end where id = u.id;
    return jsonb_build_object('ok', false, 'code', 'wrong');
  end if;
  update public.profiles set failed = 0, blocked_until = null where id = u.id;
  if u.email_confirmed_at is null then return jsonb_build_object('ok', false, 'code', 'unconfirmed'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- 프로필 (FR-07-05·06) ----------
create or replace function public.save_profile(p_name text, p_grade int, p_declaration boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles := public.me();
  nm text := trim(normalize(coalesce(p_name, ''), NFC));
  errs jsonb := '[]';
begin
  if p.id is null then return jsonb_build_object('ok', false, 'message', '로그인이 필요해요.'); end if;
  if p.role = 'operator' then return jsonb_build_object('ok', false, 'message', '운영 보조 계정은 프로필을 수정할 수 없어요.'); end if;
  if public.chars(nm) < 1 then errs := errs || '[["name","이름을 입력해주세요."]]';
  elsif public.chars(nm) > 50 then errs := errs || '[["name","이름은 50자 이하로 입력해주세요."]]'; end if;
  if p.role = 'student' then
    if p_grade is null or p_grade not between 1 and 4 then errs := errs || '[["grade","학년을 선택해주세요."]]'; end if;
    if not p.declaration and coalesce(p_declaration, false) is not true then
      errs := errs || '[["declaration","프로필을 완성하려면 소프트웨어학과 학부생인지 확인해주세요."]]'; end if;
  end if;
  if jsonb_array_length(errs) > 0 then return jsonb_build_object('ok', false, 'errors', errs); end if;
  update public.profiles set name = nm,
    grade = case when p.role = 'student' then p_grade else grade end,
    declaration = case when p.role = 'student' then true else declaration end,
    department = case when p.role = 'student' then '소프트웨어학과' else department end
  where id = p.id;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- 연구실 소속 인증 신청 (FR-07-08, 4.7.3) ----------
create or replace function public.request_verification(p_confirmed_name text, p_lab_id text, p_description text, p_proof text, p_file_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  d text := trim(normalize(coalesce(p_description, ''), NFC));
  errs jsonb := '[]';
  prev public.vreqs;
  new_id text;
begin
  select * into p from public.profiles where id = auth.uid() for update;
  if p.id is null or p.role <> 'admin' then return jsonb_build_object('ok', false, 'message', '관리자 신청 계정만 연구실 인증을 신청할 수 있어요.'); end if;
  if public.email_verified(p.id) is null then return jsonb_build_object('ok', false, 'message', '학교 이메일을 먼저 확인해주세요.'); end if;
  if p.assigned_lab_id is not null then return jsonb_build_object('ok', false, 'message', '이미 연구실이 배정된 계정이에요. 다른 연구실 추가 신청이나 배정 변경은 할 수 없어요.'); end if;
  if exists (select 1 from public.vreqs where requester_id = p.id and status = '승인 대기') then
    return jsonb_build_object('ok', false, 'message', '승인 대기 중인 요청이 있어요. 검토가 끝날 때까지 수정하거나 새로 신청할 수 없어요.'); end if;
  if public.chars(p.name) < 1 then errs := errs || '[["name","내 정보에서 본인 이름을 먼저 입력해주세요."]]'; end if;
  if not exists (select 1 from public.labs where id = p_lab_id) then errs := errs || '[["lab","대상 연구실을 선택해주세요."]]'; end if;
  if public.chars(d) < 1 then errs := errs || '[["desc","소속 설명을 입력해주세요."]]';
  elsif public.chars(d) > 500 then errs := errs || '[["desc","소속 설명은 500자 이하로 줄여주세요."]]'; end if;
  if coalesce(p_file_key, '') = '' or coalesce(p_proof, '') !~* '\.pdf$' then errs := errs || '[["proof","위임 근거 PDF를 선택해주세요."]]'; end if;
  if jsonb_array_length(errs) > 0 then return jsonb_build_object('ok', false, 'errors', errs); end if;
  -- 확정 직전에 이름이 바뀌었으면 최신 이름으로 다시 확인받는다 (FR-07-08.3)
  if p_confirmed_name is distinct from p.name then return jsonb_build_object('ok', false, 'code', 'name-changed', 'latestName', p.name); end if;
  select * into prev from public.vreqs where requester_id = p.id order by requested_at desc limit 1;
  new_id := 'V' || nextval('public.vreq_seq');
  insert into public.vreqs (id, requester_id, name_snapshot, lab_id, description, proof, file_key, status, previous_request_id)
  values (new_id, p.id, p.name, p_lab_id, d, p_proof, p_file_key, '승인 대기', case when prev.status = '반려' then prev.id end);
  return jsonb_build_object('ok', true, 'id', new_id);
end $$;

-- ---------- 운영 보조의 승인·반려 (FR-07-09~12) ----------
create or replace function public.decide_verification(p_id text, p_decision text, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me public.profiles := public.me();
  v public.vreqs;
  l public.labs;
  req public.profiles;
  rs text := trim(normalize(coalesce(p_reason, ''), NFC));
begin
  if me.id is null or me.role <> 'operator' then return jsonb_build_object('ok', false, 'message', '운영 보조 계정만 판정할 수 있어요.'); end if;
  select * into v from public.vreqs where id = p_id for update;   -- 판정 경쟁: 먼저 확정된 판정 하나만
  select * into l from public.labs where id = v.lab_id;
  if v.id is null or l.dept is distinct from me.department then return jsonb_build_object('ok', false, 'message', '검토할 수 없는 요청이에요.'); end if;
  if p_decision = 'reject' then
    if public.chars(rs) < 1 then return jsonb_build_object('ok', false, 'errors', '[["reason","반려 사유를 입력해주세요. 신청자가 무엇을 보완할지 알 수 있게 적어주세요."]]'::jsonb); end if;
    if public.chars(rs) > 500 then return jsonb_build_object('ok', false, 'errors', '[["reason","반려 사유는 500자 이하로 줄여주세요."]]'::jsonb); end if;
  end if;
  if v.status <> '승인 대기' then return jsonb_build_object('ok', false, 'code', 'race', 'message', '이미 다른 판정이 저장된 요청이에요. 최신 결과를 확인하세요.'); end if;
  if p_decision = 'approve' then
    select * into req from public.profiles where id = v.requester_id for update;
    if req.id is null or req.role <> 'admin' or public.email_verified(req.id) is null or req.assigned_lab_id is not null then
      return jsonb_build_object('ok', false, 'message', '승인 조건을 충족하지 않아요. 신청자가 이메일 확인된 미배정 관리자인지 확인하세요.');
    end if;
    update public.vreqs set status = '승인', reviewed_by = me.id, reviewed_at = now() where id = v.id;
    update public.profiles set assigned_lab_id = v.lab_id, approved_req_id = v.id where id = req.id;   -- 판정과 배정을 함께 확정 (FR-07-10.3)
  elsif p_decision = 'reject' then
    update public.vreqs set status = '반려', reviewed_by = me.id, reviewed_at = now(), rejection_reason = rs where id = v.id;
  else
    return jsonb_build_object('ok', false, 'message', '알 수 없는 판정이에요.');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- 지원서 제출 (FR-03, 3.1.7) ----------
create or replace function public.submit_application(p_rec_id text, p_intro text, p_course text, p_files jsonb, p_file_key text, p_shown_name text, p_shown_grade int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles := public.me();
  r public.recs;
  dup public.apps;
  intro text := trim(coalesce(p_intro, ''));
  n int;
  k text;
begin
  if p.id is null or p.role <> 'student' then return jsonb_build_object('ok', false, 'code', 'login'); end if;
  select * into r from public.recs where id = p_rec_id for share;
  select * into dup from public.apps where rec_id = p_rec_id and student_id = p.id;
  if dup.key is not null then return jsonb_build_object('ok', false, 'code', 'dup', 'key', dup.key); end if;
  if r.id is null or public.rec_status(r) <> '모집 중' then return jsonb_build_object('ok', false, 'code', 'closed'); end if;
  if public.email_verified(p.id) is null or public.chars(p.name) < 1 or p.grade is null or not p.declaration then
    return jsonb_build_object('ok', false, 'code', 'profile'); end if;
  -- 화면에서 확인한 프로필과 저장될 프로필이 다르면 다시 확인받는다 (FR-03-05.3)
  if p.name is distinct from p_shown_name or p.grade is distinct from p_shown_grade then
    return jsonb_build_object('ok', false, 'code', 'changed', 'latest', public.profile_json(p)); end if;
  n := public.chars(regexp_replace(intro, '\s', '', 'g'));
  if n < 1 or n > 1000 or coalesce(p_course, '') not in ('학석연계', '석사', '석박통합', '미정', '진학 계획 없음')
     or not exists (select 1 from jsonb_array_elements(coalesce(p_files, '[]')) f where f ->> 'slot' = 'cv') then
    return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
  k := lpad(nextval('public.app_seq')::text, 4, '0');
  insert into public.apps (key, id, rec_id, student_id, student, email, dept, year, file_key, intro, course, files, history)
  values ('A' || k, 'A-' || k, r.id, p.id, p.name, p.email, p.department, p.grade, p_file_key, intro, p_course, coalesce(p_files, '[]'),
          jsonb_build_array(jsonb_build_array('지원 완료', public.iso(now()))));
  return jsonb_build_object('ok', true, 'key', 'A' || k, 'id', 'A-' || k);
exception when unique_violation then
  select * into dup from public.apps where rec_id = p_rec_id and student_id = p.id;
  return jsonb_build_object('ok', false, 'code', 'dup', 'key', dup.key);
end $$;

-- ---------- 지원 철회 (FR-04-04) ----------
create or replace function public.withdraw_application(p_key text, p_expected text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles := public.me();
  a public.apps;
begin
  if p.id is null then return jsonb_build_object('ok', false, 'code', 'login'); end if;
  select * into a from public.apps where key = p_key for update;
  if a.key is null or a.student_id is distinct from p.id or public.app_status(a) is distinct from p_expected
     or p_expected not in ('지원 완료', '검토 중', '면담') then
    return jsonb_build_object('ok', false, 'code', 'changed'); end if;
  update public.apps set history = history || jsonb_build_array(jsonb_build_array('철회', public.iso(now()))) where key = a.key;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- 지원자 심사 (FR-06-03·07, BR-08) ----------
create or replace function public.decide_application(p_key text, p_rec_id text, p_expected text, p_next text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles := public.me();
  r public.recs;
  a public.apps;
  passed int;
  allowed jsonb := '{"지원 완료":["검토 중"],"검토 중":["면담","합격","불합격"],"면담":["합격","불합격"]}';
begin
  if p.id is null or not public.is_approved_admin(p) then return jsonb_build_object('ok', false, 'code', 'login'); end if;
  -- 공고 행을 잠가 같은 공고의 합격 처리를 한 줄로 세운다: 정원 검사와 저장을 한 번에 확정 (FR-06-07)
  select * into r from public.recs where id = p_rec_id for update;
  if r.id is null or r.lab_id is distinct from p.assigned_lab_id then return jsonb_build_object('ok', false, 'code', 'login'); end if;
  select * into a from public.apps where key = p_key for update;
  if a.key is null or a.rec_id <> r.id or public.app_status(a) is distinct from p_expected then
    return jsonb_build_object('ok', false, 'code', 'changed'); end if;
  if not coalesce((allowed -> p_expected) ? p_next, false) then return jsonb_build_object('ok', false, 'code', 'changed'); end if;
  if p_next = '합격' then
    select count(*) into passed from public.apps x where x.rec_id = r.id and public.app_status(x) = '합격';
    if passed >= r.capacity then return jsonb_build_object('ok', false, 'code', 'full'); end if;
  end if;
  update public.apps set history = history || jsonb_build_array(jsonb_build_array(p_next, public.iso(now()))) where key = a.key;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- 모집 공고 저장·게시·연장·조기 마감 (FR-05) ----------
create or replace function public.save_recruitment(p_id text, p_saved_at text, p_action text, p_data jsonb, p_detail text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles := public.me();
  r public.recs;
  has_apps boolean;
  st text;
  d jsonb := coalesce(p_data, '{}');
  errs jsonb := '[]';
  full_check boolean := p_action in ('publish', 'edit');
  cap int;
  s date; e date;
  new_id text;
  at timestamptz := now();
begin
  if p.id is null or not public.is_approved_admin(p) then return jsonb_build_object('ok', false, 'code', 'login'); end if;
  if p_id is not null then
    select * into r from public.recs where id = p_id for update;
    if r.id is null or r.lab_id <> p.assigned_lab_id then return jsonb_build_object('ok', false, 'code', 'conflict'); end if;
    -- 화면을 연 뒤 다른 곳에서 먼저 저장됐으면 덮어쓰지 않는다
    if public.iso(r.saved_at) is distinct from p_saved_at then return jsonb_build_object('ok', false, 'code', 'conflict'); end if;
    st := public.rec_status(r);
    has_apps := exists (select 1 from public.apps where rec_id = r.id);
    if st = '마감' then return jsonb_build_object('ok', false, 'code', 'conflict'); end if;
  elsif p_action <> 'draft' then
    return jsonb_build_object('ok', false, 'code', 'conflict');   -- 새 공고는 초안 저장부터 (UI-05)
  end if;

  if p_action in ('extend', 'close') then
    if r.id is null or not r.published then return jsonb_build_object('ok', false, 'code', 'conflict'); end if;
    if p_action = 'extend' then
      e := nullif(d ->> 'end', '')::date;
      if e is null or e <= r.end_date then return jsonb_build_object('ok', false, 'errors', '[["end","새 마감일은 현재 마감일보다 늦어야 해요."]]'::jsonb); end if;
      update public.recs set end_date = e, saved_at = at, log = log || jsonb_build_array(jsonb_build_array('기간 연장', public.iso(at), p_detail, p.name)) where id = r.id;
    else
      if st <> '모집 중' then return jsonb_build_object('ok', false, 'code', 'conflict'); end if;
      update public.recs set early_closed_at = at, saved_at = at, log = log || jsonb_build_array(jsonb_build_array('조기 마감', public.iso(at), '모집 중 → 마감', p.name)) where id = r.id;
    end if;
    return jsonb_build_object('ok', true, 'id', r.id);
  end if;

  -- 첫 지원 이후에는 일반 항목을 고칠 수 없다 (FR-05-05, INV-06)
  if has_apps then return jsonb_build_object('ok', false, 'code', 'conflict'); end if;
  if p_action = 'publish' and r.published then return jsonb_build_object('ok', false, 'code', 'conflict'); end if;
  if p_action = 'edit' and not r.published then return jsonb_build_object('ok', false, 'code', 'conflict'); end if;
  if p_action = 'draft' and r.id is not null and r.published then return jsonb_build_object('ok', false, 'code', 'conflict'); end if;

  if public.chars(d ->> 'title') not between 1 and 100 then errs := errs || '[["title","공고명을 1~100자로 입력해주세요."]]'; end if;
  if full_check and public.chars(d ->> 'topic') < 1 then errs := errs || '[["topic","게시하려면 연구 주제를 입력해주세요."]]';
  elsif public.chars(d ->> 'topic') > 200 then errs := errs || '[["topic","연구 주제는 200자 이하로 입력해주세요."]]'; end if;
  if full_check and public.chars(d ->> 'activity') < 1 then errs := errs || '[["activity","게시하려면 활동 방식을 입력해주세요."]]';
  elsif public.chars(d ->> 'activity') > 200 then errs := errs || '[["activity","활동 방식은 200자 이하로 입력해주세요."]]'; end if;
  if public.chars(d ->> 'skills') > 300 then errs := errs || '[["skills","요구 역량은 300자 이하로 입력해주세요."]]'; end if;
  if full_check or coalesce(d ->> 'capacity', '') <> '' then
    if coalesce(d ->> 'capacity', '') !~ '^[0-9]{1,2}$' or (d ->> 'capacity')::int not between 1 and 99 then
      errs := errs || '[["capacity","모집 인원은 1~99 사이 정수로 입력해주세요."]]'; else cap := (d ->> 'capacity')::int; end if;
  end if;
  begin
    s := nullif(d ->> 'start', '')::date; e := nullif(d ->> 'end', '')::date;
  exception when others then errs := errs || '[["end","날짜 형식이 올바르지 않아요."]]'; end;
  if full_check and s is null then errs := errs || '[["start","모집 시작일을 입력해주세요."]]'; end if;
  if full_check and e is null then errs := errs || '[["end","모집 마감일을 입력해주세요."]]';
  elsif s is not null and e is not null and s > e then errs := errs || '[["end","모집 마감일은 시작일보다 빠를 수 없어요."]]';
  elsif full_check and e < (now() at time zone 'Asia/Seoul')::date then errs := errs || '[["end","마감일이 이미 지났어요. 오늘 이후 날짜를 선택해주세요."]]'; end if;
  if jsonb_array_length(errs) > 0 then return jsonb_build_object('ok', false, 'errors', errs); end if;

  if r.id is null then
    new_id := 'R' || (coalesce((select max(substr(id, 2)::int) from public.recs where id ~ '^R[0-9]+$'), 7) + 1);
    insert into public.recs (id, lab_id, title, topic, activity, skills, capacity, start_date, end_date, published, saved_at, log)
    values (new_id, p.assigned_lab_id, trim(d ->> 'title'), trim(coalesce(d ->> 'topic', '')), trim(coalesce(d ->> 'activity', '')), trim(coalesce(d ->> 'skills', '')),
            cap, s, e, false, at, jsonb_build_array(jsonb_build_array('초안 저장', public.iso(at), '', p.name)));
    return jsonb_build_object('ok', true, 'id', new_id);
  end if;
  update public.recs set title = trim(d ->> 'title'), topic = trim(coalesce(d ->> 'topic', '')), activity = trim(coalesce(d ->> 'activity', '')),
    skills = trim(coalesce(d ->> 'skills', '')), capacity = cap, start_date = s, end_date = e,
    published = published or p_action = 'publish', saved_at = at,
    log = log || jsonb_build_array(jsonb_build_array(case p_action when 'publish' then '게시' when 'edit' then '내용 수정' else '초안 저장' end, public.iso(at), coalesce(p_detail, ''), p.name))
  where id = r.id;
  return jsonb_build_object('ok', true, 'id', r.id);
end $$;

-- ---------- 첨부 파일 (Storage): 본인 폴더에 올리고, 심사 권한이 있는 사람만 읽는다 ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('files', 'files', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create or replace function public.can_read_file(obj_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  owner text := split_part(obj_name, '/', 1);
  fkey text := split_part(obj_name, '/', 2);
  p public.profiles := public.me();
begin
  if p.id is null then return false; end if;
  if owner = p.id::text then return true; end if;
  if public.is_approved_admin(p) and exists (
      select 1 from public.apps a join public.recs r on r.id = a.rec_id
      where a.student_id::text = owner and a.file_key = fkey and r.lab_id = p.assigned_lab_id) then return true; end if;
  if p.role = 'operator' and exists (
      select 1 from public.vreqs v join public.labs l on l.id = v.lab_id
      where v.requester_id::text = owner and v.file_key = fkey and l.dept = p.department) then return true; end if;
  return false;
end $$;

create policy "files: 본인 폴더에 올리기" on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "files: 권한 있는 사람만 읽기" on storage.objects for select to authenticated
  using (bucket_id = 'files' and public.can_read_file(name));

-- ---------- 실행 권한 ----------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_state(), public.login_attempt(text, text) to anon, authenticated;
grant execute on function public.save_profile(text, int, boolean), public.request_verification(text, text, text, text, text),
  public.decide_verification(text, text, text), public.submit_application(text, text, text, jsonb, text, text, int),
  public.withdraw_application(text, text), public.decide_application(text, text, text, text),
  public.save_recruitment(text, text, text, jsonb, text), public.can_read_file(text) to authenticated;
