create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  use_case_description text not null check (char_length(use_case_description) between 20 and 1000),
  answers jsonb not null,
  score integer not null check (score between 0 and 100),
  risk_level text not null check (risk_level in ('LOW', 'MEDIUM', 'HIGH')),
  result jsonb not null,
  rubric_version text not null default '1.0',
  created_at timestamptz not null default now()
);

alter table public.assessments enable row level security;

create policy "People can read their own assessments"
on public.assessments for select
to authenticated
using ((select auth.uid()) = created_by);

create policy "People can create their own assessments"
on public.assessments for insert
to authenticated
with check ((select auth.uid()) = created_by);

create policy "People can delete their own assessments"
on public.assessments for delete
to authenticated
using ((select auth.uid()) = created_by);

create index assessments_created_by_created_at_idx
on public.assessments (created_by, created_at desc);

