-- ============================================================
-- Reference data + legacy Google Drive resources (from the Laravel seeders / constants.js)
-- Idempotent: safe to re-run. Run AFTER the first admin exists, otherwise the
-- legacy resources are skipped (they need an owner) — just re-run later.
-- ============================================================

insert into public.academic_years (label, start_date, end_date, is_current)
values ('2025/2026', '2025-09-01', '2026-06-30', true)
on conflict (label) do nothing;

insert into public.grade_levels (name, code, year_number, stream) values
  ('السنة أولى جذع مشترك علوم وتكنولوجيا', '1SC', 1, 'sciences'),
  ('السنة أولى جذع مشترك آداب',            '1LA', 1, 'literature'),
  ('السنة الثانية علوم تجريبية',           '2EX', 2, 'sciences'),
  ('السنة الثانية آداب وفلسفة',            '2LP', 2, 'literature'),
  ('السنة الثالثة علوم تجريبية',           '3EX', 3, 'sciences'),
  ('السنة الثالثة آداب و فلسفة',           '3LP', 3, 'literature')
on conflict (code) do update
  set name = excluded.name, year_number = excluded.year_number, stream = excluded.stream;

insert into public.subjects (name, code, icon, color) values
  ('رياضيات',          'MATH', 'bi-calculator-fill',      '#4f46e5'),
  ('فيزياء',           'PHY',  'bi-lightbulb-fill',       '#06b6d4'),
  ('علوم طبيعية',      'BIO',  'bi-flower1',              '#10b981'),
  ('لغة عربية',        'ARA',  'bi-chat-right-text-fill', '#f59e0b'),
  ('فلسفة',            'PHI',  'bi-clipboard2',           '#1f2937'),
  ('تاريخ وجغرافيا',   'HGO',  'bi-globe2',               '#ef4444'),
  ('اللغة الفرنسية',   'FRA',  'bi-translate',            '#3b82f6'),
  ('اللغة الإنجليزية', 'ENG',  'bi-translate',            '#06b6d4'),
  ('علوم إسلامية',     'ISL',  'bi-book',                 '#10b981'),
  ('المعلوماتية',      'INFO', 'bi-cpu',                  '#1f2937'),
  ('تكنولوجيا',        'TECH', 'bi-gear-fill',            '#6b7280'),
  ('التربية البدنية',  'PHYS', 'bi-dribbble',             '#ef4444'),
  ('التربية الفنية',   'ART',  'bi-palette-fill',         '#f59e0b')
on conflict (code) do update
  set name = excluded.name, icon = excluded.icon, color = excluded.color;

-- Level -> subjects (same map as GradeLevelSubjectSeeder)
with m(level_code, subject_codes) as (values
  ('1SC', array['ARA','MATH','PHY','BIO','ISL','HGO','FRA','ENG','INFO','TECH','ART']),
  ('1LA', array['ARA','MATH','PHY','BIO','ISL','HGO','FRA','ENG','INFO','ART']),
  ('2EX', array['ARA','MATH','PHY','BIO','ISL','HGO','FRA','ENG','ART']),
  ('2LP', array['ARA','PHI','MATH','PHY','BIO','ISL','HGO','FRA','ENG','ART']),
  ('3EX', array['ARA','MATH','PHY','BIO','ISL','HGO','FRA','ENG']),
  ('3LP', array['ARA','PHI','MATH','ISL','HGO','FRA','ENG'])
)
insert into public.grade_level_subject (grade_level_id, subject_id)
select g.id, s.id
from m
join public.grade_levels g on g.code = m.level_code
cross join lateral unnest(m.subject_codes) as sc(code)
join public.subjects s on s.code = sc.code
on conflict do nothing;

-- Classrooms (same as ClassroomSeeder)
insert into public.classrooms (grade_level_id, academic_year_id, name, capacity)
select g.id, (select id from public.academic_years where is_current), c.name, 30
from (values
  ('1SC', '1 ع ت 1'), ('1SC', '1 ع ت 2'),
  ('1LA', '1 أد 1'),
  ('2EX', '2 ع ت 1'), ('2EX', '2 ع ت 2'),
  ('2LP', '2 أد 1'),
  ('3EX', '3 ع ت 1'),
  ('3LP', '3 أد 1')
) as c(level_code, name)
join public.grade_levels g on g.code = c.level_code
on conflict (grade_level_id, academic_year_id, name) do nothing;

-- ============================================================
-- Legacy resources: files stay on Google Drive (external_url), nothing is re-uploaded.
-- ============================================================
do $$
declare
  v_admin uuid;
  v_year  bigint;
begin
  select id into v_admin from public.profiles where role = 'admin' and is_active order by created_at limit 1;
  if v_admin is null then
    raise notice 'No active admin yet: legacy resources skipped. Create the admin, then re-run this seed.';
    return;
  end if;
  select id into v_year from public.academic_years where is_current;

  with files(level_code, subject_code, type, title, url, size, semester) as (values
    ('1SC','INFO','lesson','درس التعليمة الشرطية',                'https://drive.google.com/file/d/16Dumx_OAbeDZ_w1glIvQzHolHIOPoRtq/view?usp=drive_link',  139264, 'الفصل الأول'),
    ('1SC','INFO','lesson','درس التعليمة التكرارية',              'https://drive.google.com/file/d/1S4nk6dOQH7W2hG3z7BzlzVfSkowbvJGX/view?usp=drive_link',  135168, 'الفصل الأول'),
    ('1SC','INFO','lesson','درس المتصفح',                         'https://drive.google.com/file/d/1bn8SZ88T-hjDUqZemtsBs6xI4a-7gcUr/view?usp=drive_link',  295936, 'الفصل الثاني'),
    ('1SC','INFO','lesson','درس هيكل صفحة الويب',                 'https://drive.google.com/file/d/1dA9MdZhqBfnBDuQK2_OX46O8yADtJCNM/view?usp=drive_link',  157696, 'الفصل الثاني'),
    ('1SC','INFO','lesson','درس الفقرات والعناوين وتنسيقات النص', 'https://drive.google.com/file/d/1tf6IgEJiDBQHQyl7eNN15F_vaaI29zVI/view?usp=sharing',     92160,  'الفصل الثاني'),
    ('1SC','INFO','lesson','ملخص الوسوم الأساسية في لغة HTML',    'https://drive.google.com/file/d/15coF9v_uMoF-gLrJmad-Pi81o_Nd9VKg/view?usp=drive_link', 1433600, 'الفصل الثاني'),
    ('1SC','INFO','lesson','تمارين حول لغة HTML',                 'https://drive.google.com/file/d/1GZR3h56yYpkAC6cOw2et53_M38at6D0r/view?usp=drive_link',  107520, 'الفصل الثاني'),
    ('1SC','INFO','homework','فرض الفصل الثالث في مادة المعلوماتية أولى علوم', 'https://drive.google.com/file/d/1xQaGlvMGWfNc_C1lI2OelUT8MI0KsESp/view?usp=drive_link', 268288, 'الفصل الثالث')
  ),
  hgo(title, url, size, semester) as (values
    ('شخصيات على شكل مخطط',                  'https://drive.google.com/file/d/1Qj9pD2tE8r_Zib2-ithaLa1yUcseFgaC/view?usp=drive_link',  10174464,  'الفصل الأول'),
    ('شخصيات ومصطلحات التاريخ الفصل الأول',  'https://drive.google.com/file/d/1JoaAP_Tp0vgYUqP1i7Bohz_lVovwtTOz/view?usp=drive_link',  34951987,  'الفصل الأول'),
    ('مصطلحات الجغرافيا الفصل الأول بكالوريا','https://drive.google.com/file/d/1MKWAKKeKMSSVM9jTrrVc0-VLL57oREtY/view?usp=drive_link',  4505600,   'الفصل الأول'),
    ('خرائط رقم 1',                          'https://drive.google.com/file/d/1ImKfZBNhimvMwdKTEgKfKKP19mVWU0pG/view?usp=sharing',     113246208, 'الفصل الأول'),
    ('أسئلة استنتاجية تاريخ',                'https://drive.google.com/file/d/1H5wjFHIjGYEZj2TaG2DsiqkUub0REmN_/view?usp=drive_link',  5558067,   'الفصل الثاني'),
    ('مصطلحات الفصول الثلاثة المهمة',        'https://drive.google.com/file/d/1AsykS724bUXyN0r9tAjg7sMrpgPZktnZ/view?usp=drive_link',  9228083,   'الفصل الثالث'),
    ('مصطلحات الفصل الثالث تاريخ وجغرافيا',  'https://drive.google.com/file/d/1pD-mZEvQsVxEJ8ylX0tt8InBftT6T2I4/view?usp=drive_link',  6396313,   'الفصل الثالث')
  ),
  all_files as (
    select * from files
    union all
    select l.code, 'HGO', 'lesson', h.title, h.url, h.size, h.semester
    from hgo h cross join (values ('3EX'), ('3LP')) as l(code)
  )
  insert into public.resources
    (user_id, academic_year_id, grade_level_id, subject_id, type, title, external_url, file_type, file_size, semester)
  select v_admin, v_year, g.id, s.id, f.type::public.resource_type, f.title, f.url, 'pdf', f.size::bigint, f.semester
  from all_files f
  join public.grade_levels g on g.code = f.level_code
  join public.subjects s     on s.code = f.subject_code
  where not exists (
    select 1 from public.resources r
    where r.title = f.title and r.type = f.type::public.resource_type
      and r.grade_level_id = g.id and r.subject_id = s.id
  );
end $$;
