-- LabKnock · 철회 지원서 열람 제한 (FR-06-05, BR-10, 부록 데이터 규칙)
-- 철회가 확정되면 관리자는 접수번호·제출일·철회일·철회 상태만 받는다. 이름·이메일·프로필·본문·첨부·개별 이력과
-- 첨부 파일의 새 서명 주소는 주지 않는다. 학생 본인은 지금처럼 전체를 본다 (FR-04-02).

-- 관리자에게 보내는 철회 지원서: 허용된 네 항목만
create or replace function public.withdrawn_app_json(a public.apps) returns jsonb
language sql stable as $$
  select jsonb_build_object('id', a.id, 'rec', a.rec_id, 'submittedAt', public.iso(a.submitted_at), 'history', jsonb_build_array(a.history -> -1))
$$;

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
    'apps', coalesce((select jsonb_object_agg(a.key,
                case when p.role = 'student' and a.student_id = p.id then public.app_json(a)
                     when public.app_status(a) = '철회' then public.withdrawn_app_json(a)
                     else public.app_json(a) end)
              from public.apps a join public.recs r on r.id = a.rec_id
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

-- 첨부 파일: 관리자는 철회되지 않은 지원서의 첨부만 새로 열 수 있다
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
      where a.student_id::text = owner and a.file_key = fkey and r.lab_id = p.assigned_lab_id
        and public.app_status(a) <> '철회') then return true; end if;
  if p.role = 'operator' and exists (
      select 1 from public.vreqs v join public.labs l on l.id = v.lab_id
      where v.requester_id::text = owner and v.file_key = fkey and l.dept = p.department) then return true; end if;
  return false;
end $$;

revoke execute on function public.withdrawn_app_json(public.apps) from public, anon, authenticated;
