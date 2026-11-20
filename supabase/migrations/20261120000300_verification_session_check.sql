-- LabKnock · 연구실 인증 신청도 살아 있는 세션에서만 받는다 (FR-07-13.3)
-- request_verification은 프로필 행을 잠그려고 me() 대신 auth.uid()를 직접 써서, 로그아웃한 토큰으로도 신청이 접수됐다.
-- 잠글 행을 me()로 찾도록 바꾼다. 함수의 나머지 규칙은 20261120000200과 같다.
create or replace function public.request_verification(p_confirmed_name text, p_lab_id text, p_description text, p_proof text, p_file_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  d text := trim(normalize(coalesce(p_description, ''), NFC));
  errs jsonb := '[]';
  prev public.vreqs;
  new_id text;
  proof_size bigint;
begin
  select * into p from public.profiles where id = (public.me()).id for update;
  if p.id is null or p.role <> 'admin' then return jsonb_build_object('ok', false, 'message', '관리자 신청 계정만 연구실 인증을 신청할 수 있어요.'); end if;
  if public.email_verified(p.id) is null then return jsonb_build_object('ok', false, 'message', '학교 이메일을 먼저 확인해주세요.'); end if;
  if p.assigned_lab_id is not null then return jsonb_build_object('ok', false, 'message', '이미 연구실이 배정된 계정이에요. 다른 연구실 추가 신청이나 배정 변경은 할 수 없어요.'); end if;
  if exists (select 1 from public.vreqs where requester_id = p.id and status = '승인 대기') then
    return jsonb_build_object('ok', false, 'message', '승인 대기 중인 요청이 있어요. 검토가 끝날 때까지 수정하거나 새로 신청할 수 없어요.'); end if;
  if public.chars(p.name) < 1 then errs := errs || '[["name","내 정보에서 본인 이름을 먼저 입력해주세요."]]'; end if;
  if not exists (select 1 from public.labs where id = p_lab_id) then errs := errs || '[["lab","대상 연구실을 선택해주세요."]]'; end if;
  if public.chars(d) < 1 then errs := errs || '[["desc","소속 설명을 입력해주세요."]]';
  elsif public.chars(d) > 500 then errs := errs || '[["desc","소속 설명은 500자 이하로 줄여주세요."]]'; end if;
  select (o.metadata ->> 'size')::bigint into proof_size from storage.objects o
    where o.bucket_id = 'files' and o.name = p.id::text || '/' || coalesce(p_file_key, '') || '/proof.pdf';
  if coalesce(p_file_key, '') = '' or coalesce(p_proof, '') !~* '\.pdf$' or proof_size is null then errs := errs || '[["proof","위임 근거 PDF를 선택해주세요."]]';
  elsif proof_size not between 1 and 5000000 then errs := errs || '[["proof","위임 근거는 5MB 이하의 PDF 파일이어야 해요."]]'; end if;
  if jsonb_array_length(errs) > 0 then return jsonb_build_object('ok', false, 'errors', errs); end if;
  -- 확정 직전에 이름이 바뀌었으면 최신 이름으로 다시 확인받는다 (FR-07-08.3)
  if p_confirmed_name is distinct from p.name then return jsonb_build_object('ok', false, 'code', 'name-changed', 'latestName', p.name); end if;
  select * into prev from public.vreqs where requester_id = p.id order by requested_at desc limit 1;
  new_id := 'V' || nextval('public.vreq_seq');
  insert into public.vreqs (id, requester_id, name_snapshot, lab_id, description, proof, file_key, status, previous_request_id)
  values (new_id, p.id, p.name, p_lab_id, d, p_proof, p_file_key, '승인 대기', case when prev.status = '반려' then prev.id end);
  return jsonb_build_object('ok', true, 'id', new_id);
end $$;
