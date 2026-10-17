-- ============================================================
-- Lycée Azail — Supabase schema (replaces the Laravel backend)
-- Run on a fresh project: SQL editor, or `supabase db push`.
-- ============================================================

-- ── Types ────────────────────────────────────────────────────
create type public.app_role      as enum ('admin','teacher','counselor','admin_staff','supervisor');
create type public.resource_type as enum ('lesson','exam','homework','guide');
create type public.audience_type as enum ('all','teachers','students','parents','guidance');

-- ── Profiles (replaces users + roles tables) ─────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  email         text,
  phone         text,
  role          public.app_role not null default 'teacher',
  is_active     boolean not null default false,
  avatar        text,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Reference data ───────────────────────────────────────────
create table public.academic_years (
  id         bigint generated always as identity primary key,
  label      text not null unique,
  start_date date not null,
  end_date   date not null check (end_date > start_date),
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index academic_years_one_current on public.academic_years (is_current) where is_current;

create table public.grade_levels (
  id          bigint generated always as identity primary key,
  name        text not null,
  code        text not null unique,
  year_number smallint not null check (year_number in (1,2,3)),
  stream      text check (stream in ('sciences','literature','common','technology')),
  created_at  timestamptz not null default now()
);

create table public.subjects (
  id         bigint generated always as identity primary key,
  name       text not null,
  name_fr    text,
  code       text not null unique,
  icon       text,
  color      text,
  created_at timestamptz not null default now()
);

create table public.grade_level_subject (
  grade_level_id bigint not null references public.grade_levels(id) on delete cascade,
  subject_id     bigint not null references public.subjects(id)     on delete cascade,
  primary key (grade_level_id, subject_id)
);

create table public.classrooms (
  id               bigint generated always as identity primary key,
  grade_level_id   bigint not null references public.grade_levels(id)   on delete restrict,
  academic_year_id bigint not null references public.academic_years(id) on delete restrict,
  name             text not null,
  capacity         integer check (capacity between 1 and 60),
  created_at       timestamptz not null default now(),
  unique (grade_level_id, academic_year_id, name)
);

create table public.teacher_subjects (
  id               bigint generated always as identity primary key,
  user_id          uuid   not null references public.profiles(id)       on delete cascade,
  subject_id       bigint not null references public.subjects(id)       on delete cascade,
  grade_level_id   bigint not null references public.grade_levels(id)   on delete cascade,
  academic_year_id bigint not null references public.academic_years(id) on delete cascade,
  unique (user_id, subject_id, grade_level_id, academic_year_id)
);

-- ── Resources (lessons / exams / homework / guides) ──────────
-- file_key     = object key in Cloudflare R2 (new uploads)
-- external_url = legacy Google Drive link (existing files)
create table public.resources (
  id               bigint generated always as identity primary key,
  user_id          uuid   not null references public.profiles(id)       on delete restrict,
  uploader_name    text,
  academic_year_id bigint not null references public.academic_years(id) on delete restrict,
  grade_level_id   bigint not null references public.grade_levels(id)   on delete restrict,
  subject_id       bigint not null references public.subjects(id)       on delete restrict,
  type             public.resource_type not null,
  title            text not null,
  description      text,
  file_key         text,
  external_url     text,
  file_name        text,
  file_type        text,
  file_size        bigint,
  semester         text,
  is_published     boolean not null default true,
  download_count   integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint resources_has_file check (file_key is not null or external_url is not null),
  -- a row may only reference objects under its owner's own R2 prefix
  -- (otherwise a teacher could point file_key at someone else's file and delete it)
  constraint resources_key_owner check (file_key is null or file_key like 'resources/' || user_id::text || '/%'),
  -- block javascript:/data: URLs that would be rendered in <a href>
  constraint resources_url_https check (external_url is null or external_url ~* '^https://')
);
create index resources_browse_idx on public.resources (type, grade_level_id, subject_id, academic_year_id);
create index resources_owner_idx  on public.resources (user_id, type);
create index resources_created_idx on public.resources (created_at desc);

-- ── Announcements ────────────────────────────────────────────
create table public.announcements (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references public.profiles(id) on delete restrict,
  author_name       text,
  title             text not null,
  body              text not null,
  audience          public.audience_type not null,
  published_by_role public.app_role not null,
  attachment_key    text,
  is_published      boolean not null default true,
  published_at      timestamptz,
  expires_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index announcements_idx on public.announcements (audience, is_published);

-- ── Timetables ───────────────────────────────────────────────
create table public.timetables (
  id               bigint generated always as identity primary key,
  classroom_id     bigint not null references public.classrooms(id)     on delete cascade,
  academic_year_id bigint not null references public.academic_years(id) on delete restrict,
  subject_id       bigint not null references public.subjects(id)       on delete restrict,
  user_id          uuid references public.profiles(id) on delete set null,
  day              text not null check (day in ('Sunday','Monday','Tuesday','Wednesday','Thursday')),
  start_time       time not null,
  end_time         time not null check (end_time > start_time),
  room             text,
  is_break         boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (classroom_id, day, start_time, academic_year_id)
);

-- ── Notifications ────────────────────────────────────────────
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null default 'generic',
  data       jsonb not null default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ============================================================
-- Helper functions
-- (security definer + empty search_path: avoids RLS recursion on profiles)
-- ============================================================
create function public.current_app_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create function public.has_role(roles public.app_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_app_role() = any(roles), false)
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(array['admin']::public.app_role[])
$$;

-- Same matrix as AnnouncementController::validateAudiencePermission
create function public.can_publish_audience(r public.app_role, a public.audience_type) returns boolean
language sql immutable set search_path = '' as $$
  select case r
    when 'admin'       then true
    when 'counselor'   then a in ('students','guidance')
    when 'admin_staff' then a in ('teachers','all')
    when 'supervisor'  then a in ('students','teachers')
    else false
  end
$$;

-- ============================================================
-- Triggers
-- ============================================================

-- New auth user -> profile.
-- IMPORTANT: role is read from raw_app_meta_data (only the service role can set it),
-- NOT raw_user_meta_data (user-editable). A signup without app_metadata.role
-- becomes an INACTIVE profile, so open signups can't grant access.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, email, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_app_meta_data->>'role')::public.app_role, 'teacher'),
    (new.raw_app_meta_data ? 'role')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Non-admins can't change role / is_active / id of a profile
create function public.protect_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.email := old.email;            -- mirrors auth.users, never edited from the client
    if not public.is_admin() then
      new.id        := old.id;
      new.role      := old.role;
      new.is_active := old.is_active;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile();

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

create trigger resources_updated     before update on public.resources     for each row execute function public.set_updated_at();
create trigger announcements_updated before update on public.announcements for each row execute function public.set_updated_at();

-- Fill uploader_name (public listing shows it without exposing profiles)
create function public.resources_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select name into new.uploader_name from public.profiles where id = new.user_id;
  return new;
end $$;

create trigger resources_fill_uploader
  before insert on public.resources
  for each row execute function public.resources_before_insert();

-- Announcement author / role / publish date are server-controlled
create function public.announcements_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.user_id           := auth.uid();
  new.published_by_role := public.current_app_role();
  select name into new.author_name from public.profiles where id = auth.uid();
  new.published_at      := coalesce(new.published_at, now());
  return new;
end $$;

create trigger announcements_fill
  before insert on public.announcements
  for each row execute function public.announcements_before_insert();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.resources       enable row level security;
alter table public.announcements   enable row level security;
alter table public.timetables      enable row level security;
alter table public.notifications   enable row level security;
alter table public.teacher_subjects enable row level security;

-- Reference tables: public read, admin-only write
-- (in Laravel these write routes were accidentally PUBLIC — see api.php)
do $$
declare t text;
begin
  foreach t in array array['academic_years','grade_levels','subjects','grade_level_subject','classrooms'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s_read" on public.%1$I for select to anon, authenticated using (true)', t);
    execute format('create policy "%1$s_admin_write" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- profiles: own row or admin. Creating/deleting users goes through an Edge Function (service role).
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- teacher_subjects
create policy teacher_subjects_read on public.teacher_subjects for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy teacher_subjects_admin on public.teacher_subjects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- resources
create policy resources_select on public.resources for select to anon, authenticated
  using (is_published or user_id = auth.uid() or public.is_admin());

create policy resources_insert on public.resources for insert to authenticated
  with check (
    public.has_role(array['admin','teacher']::public.app_role[])
    and user_id = auth.uid()
    and download_count = 0
  );

create policy resources_update on public.resources for update to authenticated
  using      (public.is_admin() or (user_id = auth.uid() and public.has_role(array['teacher']::public.app_role[])))
  with check (public.is_admin() or (user_id = auth.uid() and public.has_role(array['teacher']::public.app_role[])));

create policy resources_delete on public.resources for delete to authenticated
  using (public.is_admin() or (user_id = auth.uid() and public.has_role(array['teacher']::public.app_role[])));

-- announcements
create policy announcements_select on public.announcements for select to anon, authenticated
  using (
    (is_published and (expires_at is null or expires_at > now()))
    or user_id = auth.uid()
    or public.is_admin()
  );

create policy announcements_insert on public.announcements for insert to authenticated
  with check (
    public.current_app_role() is not null
    and public.can_publish_audience(public.current_app_role(), audience)
  );

create policy announcements_update on public.announcements for update to authenticated
  using      (public.is_admin() or user_id = auth.uid())
  with check (public.is_admin() or (user_id = auth.uid() and public.can_publish_audience(public.current_app_role(), audience)));

create policy announcements_delete on public.announcements for delete to authenticated
  using (public.is_admin() or user_id = auth.uid());

-- timetables: public read, admin/supervisor write
create policy timetables_select on public.timetables for select to anon, authenticated using (true);
create policy timetables_write  on public.timetables for all to authenticated
  using      (public.has_role(array['admin','supervisor']::public.app_role[]))
  with check (public.has_role(array['admin','supervisor']::public.app_role[]));

-- notifications: own only; inserts come from the service role
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- Table privileges (defence in depth on top of RLS)
-- ============================================================
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- download_count can't be written by clients, only through increment_download()
revoke update on public.resources from authenticated;
grant update (type, title, description, semester, is_published, file_key, external_url,
              file_name, file_type, file_size, grade_level_id, subject_id, academic_year_id)
  on public.resources to authenticated;

-- notifications: clients may only set read_at
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ============================================================
-- RPC functions (replace Laravel controller logic)
-- ============================================================

-- GET /dashboard  -> supabase.rpc('dashboard_stats')
create function public.dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'total_users',          (select count(*) from public.profiles),
    'teachers',             (select count(*) from public.profiles where role = 'teacher'),
    'total_lessons',        (select count(*) from public.resources where type = 'lesson'),
    'total_exams',          (select count(*) from public.resources where type = 'exam'),
    'total_homework',       (select count(*) from public.resources where type = 'homework'),
    'total_downloads',      (select coalesce(sum(download_count), 0) from public.resources),
    'active_announcements', (select count(*) from public.announcements
                              where is_published and (expires_at is null or expires_at > now())),
    'current_year',         (select to_jsonb(a) from public.academic_years a where a.is_current limit 1)
  );
end $$;

-- POST /academic-years/{id}/set-current
create function public.set_current_academic_year(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.academic_years set is_current = false where is_current;
  update public.academic_years set is_current = true  where id = p_id;
end $$;

-- POST /timetables/bulk (atomic: delete + insert in one transaction)
create function public.replace_timetable(p_classroom_id bigint, p_year_id bigint, p_slots jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.has_role(array['admin','supervisor']::public.app_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.timetables
   where classroom_id = p_classroom_id and academic_year_id = p_year_id;

  insert into public.timetables
    (classroom_id, academic_year_id, subject_id, user_id, day, start_time, end_time, room, is_break)
  select p_classroom_id, p_year_id,
         (s->>'subject_id')::bigint,
         nullif(s->>'user_id', '')::uuid,
         s->>'day',
         (s->>'start_time')::time,
         (s->>'end_time')::time,
         s->>'room',
         coalesce((s->>'is_break')::boolean, false)
  from jsonb_array_elements(p_slots) as s;
end $$;

-- Called ONLY by the download Edge Function (service role)
create function public.increment_download(p_id bigint) returns void
language sql security definer set search_path = '' as $$
  update public.resources set download_count = download_count + 1 where id = p_id and is_published;
$$;

revoke execute on function public.increment_download(bigint)  from public, anon, authenticated;
grant  execute on function public.increment_download(bigint)  to service_role;
revoke execute on function public.handle_new_user()           from public, anon, authenticated;
revoke execute on function public.protect_profile()           from public, anon, authenticated;
revoke execute on function public.resources_before_insert()   from public, anon, authenticated;
revoke execute on function public.announcements_before_insert() from public, anon, authenticated;

-- ============================================================
-- After creating your first user in Auth > Users, promote it:
--   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = '...';
--   update public.profiles set role = 'admin', is_active = true where id = (select id from auth.users where email = '...');
-- ============================================================
