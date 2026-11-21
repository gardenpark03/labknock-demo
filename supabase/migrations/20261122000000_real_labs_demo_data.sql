-- LabKnock · 시연 데이터를 소프트웨어학과 실제 연구실로 바꾼다 (2026-11-22)
-- 연구실 이름·담당 교수·연구 분야는 성균관대학교 소프트웨어융합대학 홈페이지(sw.skku.edu)의 공개 자료를 참고해 요약했다.
-- 모집 공고·지원서·인증 요청과 학생·관리자·운영 보조 계정은 모두 시연용 가상 데이터다. 실제 모집이 아니다.
-- 식별자(L1~L6, R1~R7, A0097~A0102, V1·V2)는 그대로 두고 연구실 8곳(L7~L14)과 공고 4건(R8~R11)을 더한다.

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
    ('L1', '지능형 임베디드소프트웨어 연구실', '신동군', '소프트웨어학과', '{인공지능,시스템}', '온디바이스 AI와 머신러닝 최적화, NPU·PIM 같은 ML 가속기, 운영체제와 스토리지를 함께 연구해요.'),
    ('L2', '컴퓨터시스템 연구실', '서의성', '소프트웨어학과', '{시스템,운영체제}', '저전력 시스템 소프트웨어와 클라우드 컴퓨팅, 가상화, 임베디드 시스템을 연구해요.'),
    ('L3', 'Software Engineering 연구실', '이은석', '소프트웨어학과', '{소프트웨어공학}', '소프트웨어 테스팅과 다중 결함 위치 추정, 테스트 최적화 같은 소프트웨어공학 기술을 연구해요.'),
    ('L4', 'Software Security 연구실', '황성재', '소프트웨어학과', '{보안,프로그래밍언어}', '소프트웨어 보안과 자동차·블록체인 보안, 프로그램 분석과 테스팅을 연구해요.'),
    ('L5', '인터랙티브데이터컴퓨팅 연구실', '조재민', '소프트웨어학과', '{HCI,정보시각화}', '인간-컴퓨터 상호작용과 정보시각화, 사람을 돕는 데이터 사이언스를 연구해요.'),
    ('L6', '대용량데이터처리 연구실', '남범석', '소프트웨어학과', '{데이터베이스,분산컴퓨팅}', '대용량 데이터 처리 시스템과 분산·병렬 컴퓨팅을 연구해요.'),
    ('L7', 'Natural Language Processing 연구실', '고영중', '소프트웨어학과', '{자연어처리,인공지능}', '대화·질의응답 시스템과 정보검색, 검색증강생성(RAG) 같은 생성형 AI를 연구해요.'),
    ('L8', '데이터 지능 및 학습 연구실 (DIAL Lab)', '이종욱', '소프트웨어학과', '{추천시스템,자연어처리}', '추천 시스템과 정보검색, 자연어처리를 바탕으로 데이터 지능을 연구해요.'),
    ('L9', '컴퓨터그래픽스 연구실 (CGLab)', '이성길', '소프트웨어학과', '{그래픽스,인공지능}', 'GPU 렌더링과 실시간 그래픽스, VR, 딥러닝 기반 그래픽스 알고리즘을 연구해요.'),
    ('L10', 'Internet of Things (IoT) 연구실', '정재훈', '소프트웨어학과', '{네트워크,보안}', '사물인터넷과 의도 기반 네트워킹, 네트워크 보안, 실내 위치 측위를 연구해요.'),
    ('L11', 'SecAI 연구실', '구형준', '소프트웨어학과', '{보안,인공지능}', 'AI를 활용한 보안과 소프트웨어·시스템 보안을 연구해요.'),
    ('L12', 'LearnData 연구실', '박호건', '소프트웨어학과', '{인공지능,데이터 분석}', '그래프 기계학습과 설명가능한 AI, 신뢰할 수 있는 AI를 연구해요.'),
    ('L13', '비주얼컴퓨팅 연구실', '허재필', '소프트웨어학과', '{컴퓨터비전,인공지능}', '이미지·비디오 인식과 검색, 이미지 생성 모델 같은 컴퓨터 비전을 연구해요.'),
    ('L14', '소프트웨어 분석 연구실', '차수영', '소프트웨어학과', '{소프트웨어공학,보안}', '화이트박스 테스팅과 프로그램 분석, 데이터 기반 취약점 자동 탐지를 연구해요.')
  on conflict (id) do update set name = excluded.name, professor = excluded.professor, dept = excluded.dept, fields = excluded.fields, intro = excluded.intro;

  update public.profiles set role = 'student', name = '가상 학생', department = '소프트웨어학과', grade = 3, declaration = true where id = u1;
  update public.profiles set role = 'admin', name = '가상 관리자', department = null, grade = null, declaration = false where id = u2;
  update public.profiles set role = 'admin', name = '가상 신청자', department = null, grade = null, declaration = false where id = u3;
  update public.profiles set role = 'operator', name = '가상 운영 보조', department = '소프트웨어학과', grade = null, declaration = false where id = u4;

  insert into public.recs (id, lab_id, title, topic, activity, skills, capacity, start_date, end_date, published, saved_at, log) values
    ('R1', 'L1', '2026 겨울 학부연구생 모집', '온디바이스 AI 모델 경량화와 추론 성능 측정', '주 1회 연구 미팅 · 실험 결과 공유', 'Python 기초, 딥러닝 수업 수강 경험', 2, '2026-11-10', '2026-11-30', true, '2026-11-09 14:30:00+09',
      jsonb_build_array(jsonb_build_array('초안 저장', public.iso('2026-11-08 16:20:00+09'), '', '가상 관리자'), jsonb_build_array('게시', public.iso('2026-11-09 14:30:00+09'), '모집기간 2026.11.10 – 2026.11.30 · 2명', '가상 관리자'))),
    ('R2', 'L2', '시스템 소프트웨어 학부연구생', '리눅스 커널 스케줄러 성능 분석', '격주 세미나 · 실험 환경 구축 참여', 'C 기초', 1, '2026-11-05', '2026-11-28', true, '2026-11-04 09:00:00+09',
      jsonb_build_array(jsonb_build_array('게시', public.iso('2026-11-04 09:00:00+09'), '모집기간 2026.11.05 – 2026.11.28 · 1명', '이전 관리자'))),
    ('R3', 'L3', '테스트 자동화 연구 참여', '테스트 케이스 자동 생성·최적화 도구 평가', '주 1회 미팅 · 도구 실험', 'Java 또는 Python', 2, '2026-12-01', '2026-12-14', true, '2026-11-15 09:00:00+09', '[]'),
    ('R4', 'L4', '보안 취약점 분석 학부연구생', '오픈소스 소프트웨어 취약점 재현과 분석', '주 2회 스터디', '리눅스 사용 경험', 1, '2026-10-01', '2026-11-08', true, '2026-09-28 09:00:00+09', '[]'),
    ('R5', 'L5', 'HCI 사용자 연구 보조', '데이터 시각화 도구 사용성 평가', '사용자 인터뷰 · 데이터 정리', '', 3, '2026-11-12', '2026-11-29', true, '2026-11-11 09:00:00+09', '[]'),
    ('R6', 'L1', '2027 봄 학부연구생 모집', '', '', '', null, null, null, false, '2026-11-14 10:12:40+09',
      jsonb_build_array(jsonb_build_array('초안 저장', public.iso('2026-11-14 10:12:40+09'), '', '가상 관리자'))),
    ('R7', 'L6', '데이터 시스템 학부연구생', '분산 데이터 처리 엔진 성능 실험', '주 1회 미팅 · 실험 결과 공유', 'SQL 기초, C++ 또는 Python', 2, '2026-11-01', '2026-12-05', true, '2026-10-30 09:00:00+09', '[]'),
    ('R8', 'L7', 'LLM 검색증강생성 실험 보조', 'RAG 파이프라인 구축과 답변 품질 평가', '주 1회 미팅 · 논문 스터디', 'Python, PyTorch 기초', 2, '2026-11-15', '2026-12-07', true, '2026-11-14 09:00:00+09', '[]'),
    ('R9', 'L8', '추천 시스템 연구 학부연구생', '추천 모델 재현 실험과 데이터셋 정리', '격주 미팅 · 코드 리뷰', 'Python, 기계학습 수업 수강', 2, '2026-11-18', '2026-12-10', true, '2026-11-17 09:00:00+09', '[]'),
    ('R10', 'L9', '실시간 렌더링 학부연구생', 'GPU 기반 실시간 렌더링 기법 구현', '주 1회 미팅 · 구현 데모', 'C++ 기초, 선형대수', 1, '2026-12-02', '2026-12-20', true, '2026-11-20 09:00:00+09', '[]'),
    ('R11', 'L10', 'IoT 네트워크 실험 학부연구생', '의도 기반 네트워크 보안 기능 실험', '주 1회 미팅 · 테스트베드 실험', '컴퓨터네트워크 수업 수강', 2, '2026-11-03', '2026-11-20', true, '2026-11-02 09:00:00+09', '[]');

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
    ('V1', u2, '가상 관리자', 'L1', '연구실 소속 대학원생으로 학부연구생 모집 공고와 지원자 관리를 맡고 있어요. (시연용 가상 요청)', '위임확인서.pdf', 'assets/samples/sample-proof-l1.pdf', '승인', '2026-11-02 14:10:00+09', u4, '2026-11-03 10:30:00+09'),
    ('V2', u3, '가상 신청자', 'L2', '연구실 소속 대학원생으로 학부연구생 모집 공고 관리를 맡게 됐어요. (시연용 가상 요청)', '소속확인서.pdf', 'assets/samples/sample-proof-l2.pdf', '승인 대기', '2026-11-15 11:02:31+09', null, null);
  update public.profiles set assigned_lab_id = 'L1', approved_req_id = 'V1' where id = u2;

  perform setval('public.app_seq', 103, false);
  perform setval('public.vreq_seq', 3, false);
end $$;

select public.seed_demo_data();
