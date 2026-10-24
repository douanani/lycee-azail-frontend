-- Enforce announcement audience at the database level.
--
-- Before: announcements_select let `anon` (anyone holding the public anon key) read
-- every published announcement, including ones addressed to teachers or guidance,
-- and any signed-in user - even one with an inactive/role-less profile - saw them too.
--
-- After:
--   * anon              -> only published, non-expired announcements addressed to the public
--                          audiences: all, students, parents.
--   * active staff      -> every published, non-expired announcement (teachers/guidance included).
--   * author / admin    -> their own / everything, regardless of publish state (unchanged).
-- Signed-in users without an active role (open signups become inactive profiles) are treated like anon.

drop policy if exists announcements_select on public.announcements;

create policy announcements_select_public on public.announcements
  for select to anon, authenticated
  using (
    is_published
    and (expires_at is null or expires_at > now())
    and audience in ('all', 'students', 'parents')
  );

create policy announcements_select_staff on public.announcements
  for select to authenticated
  using (
    (is_published and (expires_at is null or expires_at > now()) and public.current_app_role() is not null)
    or user_id = auth.uid()
    or public.is_admin()
  );
