-- Training module schema for Supabase (PostgreSQL)
-- Run in Supabase SQL editor.

create table if not exists public.training_courses (
  id bigserial primary key,
  title text not null,
  description text,
  cover_url text,
  category text,
  difficulty text default 'beginner',
  estimated_minutes integer default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_modules (
  id bigserial primary key,
  course_id bigint not null references public.training_courses(id) on delete cascade,
  title text not null,
  sort_order integer not null default 1
);

create table if not exists public.training_lessons (
  id bigserial primary key,
  module_id bigint not null references public.training_modules(id) on delete cascade,
  title text not null,
  lesson_type text not null check (lesson_type in ('content', 'video', 'resources', 'quiz')),
  sort_order integer not null default 1,
  content_html text,
  video_url text,
  resources_json jsonb
);

create table if not exists public.training_quizzes (
  id bigserial primary key,
  course_id bigint references public.training_courses(id) on delete cascade,
  lesson_id bigint references public.training_lessons(id) on delete cascade,
  module_id bigint references public.training_modules(id) on delete cascade,
  title text not null,
  pass_mark numeric(5,2) not null default 50,
  time_limit_seconds integer,
  created_at timestamptz not null default now(),
  constraint quiz_target_check check (
    ((course_id is not null)::int + (module_id is not null)::int + (lesson_id is not null)::int) = 1
  )
);

create table if not exists public.training_quiz_questions (
  id bigserial primary key,
  quiz_id bigint not null references public.training_quizzes(id) on delete cascade,
  question_text text not null,
  question_type text not null check (question_type in ('single', 'multi', 'truefalse', 'short')),
  options_json jsonb,
  correct_answer_json jsonb,
  points integer not null default 1
);

create table if not exists public.training_enrollments (
  id bigserial primary key,
  user_id bigint not null,
  course_id bigint not null references public.training_courses(id) on delete cascade,
  assigned_by bigint,
  assigned_at timestamptz not null default now(),
  due_date date,
  status text default 'assigned',
  unique (user_id, course_id)
);

create table if not exists public.training_progress (
  id bigserial primary key,
  user_id bigint not null,
  lesson_id bigint not null references public.training_lessons(id) on delete cascade,
  is_completed boolean not null default false,
  completed_at timestamptz,
  last_position_seconds integer,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table if not exists public.training_quiz_attempts (
  id bigserial primary key,
  user_id bigint not null,
  quiz_id bigint not null references public.training_quizzes(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(5,2),
  pass boolean,
  answers_json jsonb
);

-- Backward-compatible migration for existing environments.
alter table public.training_quizzes
  add column if not exists course_id bigint references public.training_courses(id) on delete cascade;

alter table public.training_quizzes drop constraint if exists quiz_target_check;
alter table public.training_quizzes
  add constraint quiz_target_check check (
    ((course_id is not null)::int + (module_id is not null)::int + (lesson_id is not null)::int) = 1
  );

create index if not exists idx_training_modules_course_id on public.training_modules(course_id);
create index if not exists idx_training_lessons_module_id on public.training_lessons(module_id);
create index if not exists idx_training_quizzes_course_id on public.training_quizzes(course_id);
create index if not exists idx_training_quizzes_lesson_id on public.training_quizzes(lesson_id);
create index if not exists idx_training_quizzes_module_id on public.training_quizzes(module_id);
create index if not exists idx_training_questions_quiz_id on public.training_quiz_questions(quiz_id);
create index if not exists idx_training_enrollments_user_id on public.training_enrollments(user_id);
create index if not exists idx_training_progress_user_id on public.training_progress(user_id);
create index if not exists idx_training_quiz_attempts_user_id on public.training_quiz_attempts(user_id);

-- Optional: if you maintain updated_at with triggers.
-- create trigger set_training_courses_updated_at before update on public.training_courses
-- for each row execute function public.handle_updated_at();

-- RLS baseline examples (adjust to your auth model):
alter table public.training_courses enable row level security;
alter table public.training_modules enable row level security;
alter table public.training_lessons enable row level security;
alter table public.training_quizzes enable row level security;
alter table public.training_quiz_questions enable row level security;
alter table public.training_enrollments enable row level security;
alter table public.training_progress enable row level security;
alter table public.training_quiz_attempts enable row level security;

-- Custom-auth compatible RLS:
-- This project authenticates users outside Supabase Auth. We treat requests that
-- include our app header as trusted app traffic, and keep non-app traffic limited.
create or replace function public.training_is_trusted_client()
returns boolean
language sql
stable
as $$
  select coalesce(
    (current_setting('request.headers', true)::jsonb ->> 'x-application-name') = 'julinemart-hr-system',
    false
  );
$$;

-- Drop old policies first.
drop policy if exists training_admin_all_courses on public.training_courses;
drop policy if exists training_employee_read_published_courses on public.training_courses;
drop policy if exists training_employee_own_progress on public.training_progress;
drop policy if exists training_employee_own_attempts on public.training_quiz_attempts;

drop policy if exists training_courses_trusted_all on public.training_courses;
drop policy if exists training_courses_public_published on public.training_courses;
drop policy if exists training_modules_trusted_all on public.training_modules;
drop policy if exists training_modules_public_published on public.training_modules;
drop policy if exists training_lessons_trusted_all on public.training_lessons;
drop policy if exists training_lessons_public_published on public.training_lessons;
drop policy if exists training_quizzes_trusted_all on public.training_quizzes;
drop policy if exists training_quizzes_public_published on public.training_quizzes;
drop policy if exists training_questions_trusted_all on public.training_quiz_questions;
drop policy if exists training_questions_public_published on public.training_quiz_questions;
drop policy if exists training_enrollments_trusted_all on public.training_enrollments;
drop policy if exists training_progress_trusted_all on public.training_progress;
drop policy if exists training_attempts_trusted_all on public.training_quiz_attempts;

-- Courses: trusted app can do all; non-app can read only published.
create policy training_courses_trusted_all
  on public.training_courses
  for all
  using (public.training_is_trusted_client())
  with check (public.training_is_trusted_client());

create policy training_courses_public_published
  on public.training_courses
  for select
  using (status = 'published');

-- Modules: trusted app can do all; non-app can read only for published courses.
create policy training_modules_trusted_all
  on public.training_modules
  for all
  using (public.training_is_trusted_client())
  with check (public.training_is_trusted_client());

create policy training_modules_public_published
  on public.training_modules
  for select
  using (
    exists (
      select 1
      from public.training_courses c
      where c.id = training_modules.course_id
        and c.status = 'published'
    )
  );

-- Lessons: trusted app can do all; non-app can read only for published courses.
create policy training_lessons_trusted_all
  on public.training_lessons
  for all
  using (public.training_is_trusted_client())
  with check (public.training_is_trusted_client());

create policy training_lessons_public_published
  on public.training_lessons
  for select
  using (
    exists (
      select 1
      from public.training_modules m
      join public.training_courses c on c.id = m.course_id
      where m.id = training_lessons.module_id
        and c.status = 'published'
    )
  );

-- Quizzes: trusted app can do all; non-app can read only for published courses.
create policy training_quizzes_trusted_all
  on public.training_quizzes
  for all
  using (public.training_is_trusted_client())
  with check (public.training_is_trusted_client());

create policy training_quizzes_public_published
  on public.training_quizzes
  for select
  using (
    exists (
      select 1
      from public.training_courses c
      where c.id = training_quizzes.course_id
        and c.status = 'published'
    )
    or exists (
      select 1
      from public.training_modules m
      join public.training_courses c on c.id = m.course_id
      where m.id = training_quizzes.module_id
        and c.status = 'published'
    )
    or exists (
      select 1
      from public.training_lessons l
      join public.training_modules m on m.id = l.module_id
      join public.training_courses c on c.id = m.course_id
      where l.id = training_quizzes.lesson_id
        and c.status = 'published'
    )
  );

-- Quiz questions: trusted app can do all; non-app can read only for published quizzes.
create policy training_questions_trusted_all
  on public.training_quiz_questions
  for all
  using (public.training_is_trusted_client())
  with check (public.training_is_trusted_client());

create policy training_questions_public_published
  on public.training_quiz_questions
  for select
  using (
    exists (
      select 1
      from public.training_quizzes q
      where q.id = training_quiz_questions.quiz_id
        and (
          exists (
            select 1 from public.training_courses c
            where c.id = q.course_id and c.status = 'published'
          )
          or exists (
            select 1
            from public.training_modules m
            join public.training_courses c on c.id = m.course_id
            where m.id = q.module_id and c.status = 'published'
          )
          or exists (
            select 1
            from public.training_lessons l
            join public.training_modules m on m.id = l.module_id
            join public.training_courses c on c.id = m.course_id
            where l.id = q.lesson_id and c.status = 'published'
          )
        )
    )
  );

-- User activity and reporting tables: only trusted app traffic can access.
create policy training_enrollments_trusted_all
  on public.training_enrollments
  for all
  using (public.training_is_trusted_client())
  with check (public.training_is_trusted_client());

create policy training_progress_trusted_all
  on public.training_progress
  for all
  using (public.training_is_trusted_client())
  with check (public.training_is_trusted_client());

create policy training_attempts_trusted_all
  on public.training_quiz_attempts
  for all
  using (public.training_is_trusted_client())
  with check (public.training_is_trusted_client());
