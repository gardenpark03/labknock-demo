-- LabKnock · 발표용 데모 계정과 가상 데이터, 초기화
-- 모든 인물·연구실·공고는 가상이다. 데모 계정 4개는 이메일 확인이 끝난 상태로 만든다(실제 메일을 보내지 않는다).

create or replace function public.ensure_demo_users() returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  d record;
begin
  for d in select * from (values
    ('00000000-0000-4000-8000-000000000001'::uuid, 'student-a@g.skku.edu', 'student'),
    ('00000000-0000-4000-8000-000000000002'::uuid, 'admin-a@skku.edu', 'admin'),
    ('00000000-0000-4000-8000-000000000003'::uuid, 'admin-b@skku.edu', 'admin'),
    ('00000000-0000-4000-8000-000000000004'::uuid, 'ops@skku.edu', 'student')) as t(id, email, role)
  loop
    if not exists (select 1 from auth.users where id = d.id) then
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token)
      values ('00000000-0000-0000-0000-000000000000', d.id, 'authenticated', 'authenticated', d.email,
        crypt('labknock-demo-2026', gen_salt('bf')), '2026-11-01 10:05:00+09',
        '{"provider":"email","providers":["email"]}', jsonb_build_object('role', d.role), '2026-11-01 10:00:00+09', now(),
        '', '', '', '', '', '');
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), d.id, d.id::text, jsonb_build_object('sub', d.id::text, 'email', d.email, 'email_verified', true),
        'email', now(), now(), now());
    end if;
  end loop;
end $$;

create or replace function public.seed_demo_data() returns void
language plpgsql security definer set search_path = public as $$
declare
  u1 uuid := '00000000-0000-4000-8000-000000000001';
  u2 uuid := '00000000-0000-4000-8000-000000000002';
  u3 uuid := '00000000-0000-4000-8000-000000000003';
  u4 uuid := '00000000-0000-4000-8000-000000000004';
begin
  delete from public.apps where true;   -- API 요청의 전체 삭제 보호(safeupdate)를 위해 조건을 적는다
  delete from public.vreqs where true;   -- API 요청의 전체 삭제 보호(safeupdate)를 위해 조건을 적는다
  delete from public.recs where true;   -- API 요청의 전체 삭제 보호(safeupdate)를 위해 조건을 적는다
  -- 가입한 다른 관리자 신청자의 배정도 함께 처음 상태로 돌린다
  update public.profiles set assigned_lab_id = null, approved_req_id = null, failed = 0, blocked_until = null where true;

  insert into public.labs (id, name, professor, dept, fields, intro) values
    ('L1', '지능형시스템 연구실', '김가상', '소프트웨어학과', '{인공지능,데이터 분석}', '학습 기반 지능형 시스템과 모델 평가 방법을 연구합니다.'),
    ('L2', '컴퓨팅시스템 연구실', '이가상', '소프트웨어학과', '{시스템,운영체제}', '운영체제와 시스템 소프트웨어의 성능·안정성을 연구합니다.'),
    ('L3', '소프트웨어공학 연구실', '박가상', '소프트웨어학과', '{소프트웨어공학}', '요구공학과 테스트 자동화를 연구합니다.'),
    ('L4', '정보보호 연구실', '최가상', '소프트웨어학과', '{보안,네트워크}', '소프트웨어 취약점 분석과 네트워크 보안을 연구합니다.'),
    ('L5', '인간컴퓨터상호작용 연구실', '정가상', '소프트웨어학과', '{HCI,데이터 분석}', '사용자 경험과 인터랙션 설계를 연구합니다.'),
    ('L6', '데이터베이스 연구실', '한가상', '소프트웨어학과', '{데이터베이스,데이터 분석}', '대규모 데이터 저장·질의 처리 기술을 연구합니다.')
  on conflict (id) do update set name = excluded.name, professor = excluded.professor, dept = excluded.dept, fields = excluded.fields, intro = excluded.intro;

  update public.profiles set role = 'student', name = '가상 학생', department = '소프트웨어학과', grade = 3, declaration = true where id = u1;
  update public.profiles set role = 'admin', name = '가상 관리자', department = null, grade = null, declaration = false where id = u2;
  update public.profiles set role = 'admin', name = '가상 신청자', department = null, grade = null, declaration = false where id = u3;
  update public.profiles set role = 'operator', name = '가상 운영 보조', department = '소프트웨어학과', grade = null, declaration = false where id = u4;

  insert into public.recs (id, lab_id, title, topic, activity, skills, capacity, start_date, end_date, published, saved_at, log) values
    ('R1', 'L1', '2026 겨울 학부연구생 모집', '지능형 시스템 실험 및 모델 성능 비교', '주 1회 연구 미팅 · 실험 결과 공유', 'Python 기초와 협업 경험', 2, '2026-11-10', '2026-11-30', true, '2026-11-09 14:30:00+09',
      jsonb_build_array(jsonb_build_array('초안 저장', public.iso('2026-11-08 16:20:00+09'), '', '가상 관리자'), jsonb_build_array('게시', public.iso('2026-11-09 14:30:00+09'), '모집기간 2026.11.10 – 2026.11.30 · 2명', '가상 관리자'))),
    ('R2', 'L2', '시스템 소프트웨어 학부연구생', '리눅스 커널 스케줄러 성능 분석', '격주 세미나 · 실험 환경 구축 참여', 'C 기초', 1, '2026-11-05', '2026-11-28', true, '2026-11-04 09:00:00+09',
      jsonb_build_array(jsonb_build_array('게시', public.iso('2026-11-04 09:00:00+09'), '모집기간 2026.11.05 – 2026.11.28 · 1명', '이전 관리자'))),
    ('R3', 'L3', '테스트 자동화 연구 참여', '테스트 케이스 자동 생성 도구 평가', '주 1회 미팅 · 도구 실험', 'Java 또는 Python', 2, '2026-12-01', '2026-12-14', true, '2026-11-15 09:00:00+09', '[]'),
    ('R4', 'L4', '보안 취약점 분석 학부연구생', '오픈소스 취약점 재현과 분석', '주 2회 스터디', '리눅스 사용 경험', 1, '2026-10-01', '2026-11-08', true, '2026-09-28 09:00:00+09', '[]'),
    ('R5', 'L5', 'HCI 사용자 연구 보조', '모바일 앱 사용성 평가', '사용자 인터뷰 · 데이터 정리', '', 3, '2026-11-12', '2026-11-29', true, '2026-11-11 09:00:00+09', '[]'),
    ('R6', 'L1', '2027 봄 학부연구생 모집', '', '', '', null, null, null, false, '2026-11-14 10:12:40+09',
      jsonb_build_array(jsonb_build_array('초안 저장', public.iso('2026-11-14 10:12:40+09'), '', '가상 관리자'))),
    ('R7', 'L6', '데이터 시스템 학부연구생', '질의 최적화 실험', '주 1회 미팅', 'SQL 기초', 2, '2026-11-01', '2026-12-05', true, '2026-10-30 09:00:00+09', '[]');

  insert into public.apps (key, id, rec_id, student_id, student, email, dept, year, sample, intro, course, files, submitted_at, history) values
    ('A0097', 'A-0097', 'R1', null, '가상 학생 E', 'student-e@g.skku.edu', '소프트웨어학과', 4, true, '데이터 분석 동아리에서 시각화 프로젝트를 진행했습니다.', '석사', '["CV.pdf"]', '2026-11-11 10:20:00+09',
      jsonb_build_array(jsonb_build_array('지원 완료', public.iso('2026-11-11 10:20:00+09')), jsonb_build_array('검토 중', public.iso('2026-11-12 09:10:00+09')), jsonb_build_array('합격', public.iso('2026-11-14 16:00:00+09')))),
    ('A0098', 'A-0098', 'R1', null, '가상 학생 B', 'student-b@g.skku.edu', '소프트웨어학과', 3, true, '머신러닝 수업 프로젝트로 이미지 분류 모델을 만들었습니다.', '학석연계', '["CV.pdf","성적증명서.pdf"]', '2026-11-12 13:05:00+09',
      jsonb_build_array(jsonb_build_array('지원 완료', public.iso('2026-11-12 13:05:00+09')), jsonb_build_array('검토 중', public.iso('2026-11-13 11:00:00+09')))),
    ('A0099', 'A-0099', 'R1', null, '가상 학생 C', 'student-c@g.skku.edu', '소프트웨어학과', 2, true, '파이썬으로 실험 자동화 스크립트를 작성한 경험이 있습니다.', '미정', '["CV.pdf"]', '2026-11-13 18:40:00+09',
      jsonb_build_array(jsonb_build_array('지원 완료', public.iso('2026-11-13 18:40:00+09')), jsonb_build_array('검토 중', public.iso('2026-11-14 10:00:00+09')), jsonb_build_array('면담', public.iso('2026-11-15 15:20:00+09')))),
    ('A0100', 'A-0100', 'R1', null, '가상 학생 D', 'student-d@g.skku.edu', '소프트웨어학과', 3, true, '', '', '[]', '2026-11-14 09:30:00+09',
      jsonb_build_array(jsonb_build_array('지원 완료', public.iso('2026-11-14 09:30:00+09')), jsonb_build_array('철회', public.iso('2026-11-15 08:10:00+09')))),
    ('A0102', 'A-0102', 'R2', u1, '가상 학생', 'student-a@g.skku.edu', '소프트웨어학과', 3, true, '운영체제 수업에서 스케줄러 과제를 구현하며 시스템 소프트웨어에 관심을 갖게 되었습니다.', '석사', '["CV.pdf"]', '2026-11-15 21:00:00+09',
      jsonb_build_array(jsonb_build_array('지원 완료', public.iso('2026-11-15 21:00:00+09')), jsonb_build_array('검토 중', public.iso('2026-11-16 09:30:00+09'))));

  insert into public.vreqs (id, requester_id, name_snapshot, lab_id, description, proof, sample, status, requested_at, reviewed_by, reviewed_at) values
    ('V1', u2, '가상 관리자', 'L1', '지능형시스템 연구실 박사과정이며, 지도교수님께 학부연구생 모집 공고와 지원자 관리를 위임받았습니다.', '위임확인서.pdf', 'assets/samples/sample-proof-l1.pdf', '승인', '2026-11-02 14:10:00+09', u4, '2026-11-03 10:30:00+09'),
    ('V2', u3, '가상 신청자', 'L2', '컴퓨팅시스템 연구실 석사과정이며, 지도교수님께 학부연구생 모집 공고 관리를 위임받았습니다.', '소속확인서.pdf', 'assets/samples/sample-proof-l2.pdf', '승인 대기', '2026-11-15 11:02:31+09', null, null);
  update public.profiles set assigned_lab_id = 'L1', approved_req_id = 'V1' where id = u2;

  perform setval('public.app_seq', 103, false);
  perform setval('public.vreq_seq', 3, false);
end $$;

-- 운영 보조 계정(또는 관리 도구)만 데모 데이터를 처음 상태로 되돌릴 수 있다
create or replace function public.reset_demo() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles := public.me();
begin
  if coalesce(auth.role(), '') <> 'service_role' and (p.id is null or p.role <> 'operator') then
    return jsonb_build_object('ok', false, 'message', '운영 보조 계정만 데모 데이터를 초기화할 수 있어요.');
  end if;
  perform public.ensure_demo_users();
  perform public.seed_demo_data();
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.ensure_demo_users(), public.seed_demo_data(), public.reset_demo() from public, anon, authenticated;
grant execute on function public.reset_demo() to authenticated, service_role;

select public.ensure_demo_users();
select public.seed_demo_data();
