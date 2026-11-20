-- FR-05-05·09: 행을 잠근 상태에서 판단한 저장 거절 사유를 함께 반환한다.
-- 기존 클라이언트가 쓰는 conflict 코드와 함수 시그니처는 유지한다.
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
    st := public.rec_status(r);
    if st = '마감' then return jsonb_build_object('ok', false, 'code', 'conflict', 'reason', 'closed'); end if;
    if public.iso(r.saved_at) is distinct from p_saved_at then return jsonb_build_object('ok', false, 'code', 'conflict', 'reason', 'version', 'savedAt', public.iso(r.saved_at)); end if;
    has_apps := exists (select 1 from public.apps where rec_id = r.id);
  elsif p_action <> 'draft' then
    return jsonb_build_object('ok', false, 'code', 'conflict', 'reason', 'state');   -- 새 공고는 초안 저장부터 (UI-05)
  end if;

  if p_action in ('extend', 'close') then
    if r.id is null or not r.published then return jsonb_build_object('ok', false, 'code', 'conflict', 'reason', 'state'); end if;
    if p_action = 'extend' then
      e := nullif(d ->> 'end', '')::date;
      if e is null or e <= r.end_date then return jsonb_build_object('ok', false, 'errors', '[["end","새 마감일은 현재 마감일보다 늦어야 해요."]]'::jsonb); end if;
      update public.recs set end_date = e, saved_at = at, log = log || jsonb_build_array(jsonb_build_array('기간 연장', public.iso(at), p_detail, p.name)) where id = r.id;
    else
      if st <> '모집 중' then return jsonb_build_object('ok', false, 'code', 'conflict', 'reason', 'state'); end if;
      update public.recs set early_closed_at = at, saved_at = at, log = log || jsonb_build_array(jsonb_build_array('조기 마감', public.iso(at), '모집 중 → 마감', p.name)) where id = r.id;
    end if;
    return jsonb_build_object('ok', true, 'id', r.id);
  end if;

  -- 첫 지원 이후에는 일반 항목을 고칠 수 없다 (FR-05-05, INV-06)
  if has_apps then return jsonb_build_object('ok', false, 'code', 'conflict', 'reason', 'locked'); end if;
  if p_action = 'publish' and r.published then return jsonb_build_object('ok', false, 'code', 'conflict', 'reason', 'state'); end if;
  if p_action = 'edit' and not r.published then return jsonb_build_object('ok', false, 'code', 'conflict', 'reason', 'state'); end if;
  if p_action = 'draft' and r.id is not null and r.published then return jsonb_build_object('ok', false, 'code', 'conflict', 'reason', 'state'); end if;

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
