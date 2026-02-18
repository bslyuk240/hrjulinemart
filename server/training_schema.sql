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

-- Admin/HR full access (replace with your real role claims or mapping table)
drop policy if exists training_admin_all_courses on public.training_courses;
create policy training_admin_all_courses
  on public.training_courses
  for all
  using ((auth.jwt() ->> 'role') in ('admin', 'hr'))
  with check ((auth.jwt() ->> 'role') in ('admin', 'hr'));

-- Employees read only published courses.
drop policy if exists training_employee_read_published_courses on public.training_courses;
create policy training_employee_read_published_courses
  on public.training_courses
  for select
  using (status = 'published');

-- Employees manage own progress.
drop policy if exists training_employee_own_progress on public.training_progress;
create policy training_employee_own_progress
  on public.training_progress
  for all
  using (user_id = coalesce((auth.jwt() ->> 'employee_id')::bigint, -1))
  with check (user_id = coalesce((auth.jwt() ->> 'employee_id')::bigint, -1));

-- Employees manage own quiz attempts.
drop policy if exists training_employee_own_attempts on public.training_quiz_attempts;
create policy training_employee_own_attempts
  on public.training_quiz_attempts
  for all
  using (user_id = coalesce((auth.jwt() ->> 'employee_id')::bigint, -1))
  with check (user_id = coalesce((auth.jwt() ->> 'employee_id')::bigint, -1));
