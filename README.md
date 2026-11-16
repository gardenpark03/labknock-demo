# LabKnock 웹 서비스 (시연용)

소프트웨어공학개론 팀 프로젝트 '랩노크(LabKnock)'의 요구사항 명세(SRS v1.3)를 실제로 동작하는 웹 서비스로 만든 발표·시연용 프로젝트입니다.

- 화면: HTML·CSS·바닐라 JS 정적 사이트(GitHub Pages)
- 서버: Supabase(Postgres·인증·파일 저장소). 공고·지원·심사·인증 요청이 서버에 저장되고 모든 사용자가 같은 데이터를 봅니다. 권한과 업무 규칙(정원 초과 차단, 첫 지원 이후 공고 고정, 상태 전이, 인증 승인과 연구실 배정)은 서버 함수가 다시 검사합니다.
- 회원가입은 skku.edu·g.skku.edu 학교 이메일만 됩니다. 가입하면 그 주소로 확인 메일이 실제로 가고, 링크를 누르면 확인과 로그인이 끝납니다.
- 첫 화면은 홈입니다. 로그인 화면의 '발표용 데모 계정'(학생·연구실 관리자·관리자 신청자·운영 보조)으로 바로 로그인할 수 있습니다. 비밀번호는 `labknock-demo-2026`입니다.
- 인물·연구실·공고와 예시 PDF는 모두 가상 데이터입니다. 운영 보조 계정으로 로그인하면 화면 아래 '데모 데이터 초기화'로 처음 상태로 돌릴 수 있습니다.

글꼴: Pretendard (SIL Open Font License 1.1, `assets/fonts/OFL.txt`) · Supabase JS 클라이언트 2.118.0 (MIT, `assets/vendor/supabase-LICENSE.txt`)

로컬 실행 방법, 팀원 작업 방법, 화면별 코드 위치는 [CONTRIBUTING.md](CONTRIBUTING.md)에 있습니다.
