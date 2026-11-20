-- LabKnock · 로그아웃·만료된 세션은 다시 쓸 수 없다 (FR-07-13.3)
-- 토큰(JWT)은 발급 뒤 만료(1시간)까지 그 자체로 유효하다. 로그아웃하면 서버 세션(auth.sessions)은 지워지므로,
-- 모든 서버 함수와 첨부 권한이 거치는 me()가 토큰의 세션이 아직 남아 있는지 함께 확인한다.
create or replace function public.me() returns public.profiles
language sql stable security definer set search_path = public as $$
  select p.* from public.profiles p
  where p.id = auth.uid()
    and exists (select 1 from auth.sessions s where s.id = (auth.jwt() ->> 'session_id')::uuid and s.user_id = p.id)
$$;

-- 첨부 올리기도 살아 있는 세션의 본인 폴더에만 (기존 정책은 auth.uid()만 봐서 로그아웃한 토큰으로도 올릴 수 있었다)
create or replace function public.session_uid() returns uuid
language sql stable security definer set search_path = public as $$
  select (public.me()).id
$$;
revoke execute on function public.session_uid() from public, anon;
grant execute on function public.session_uid() to authenticated;

drop policy "files: 본인 폴더에 올리기" on storage.objects;
create policy "files: 본인 폴더에 올리기" on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = public.session_uid()::text);
