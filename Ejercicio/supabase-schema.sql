-- Ejecuta todo este archivo en Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text not null default '',
  public_data jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.answer_keys (
  evaluation_id uuid primary key references public.evaluations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  keys jsonb not null default '{}'::jsonb
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  student_name text not null check (char_length(student_name) between 1 and 150),
  student_group text not null check (char_length(student_group) between 1 and 80),
  student_date date not null default current_date,
  answers jsonb not null,
  earned numeric not null default 0,
  total numeric not null default 0,
  auto_count integer not null default 0,
  submitted_at timestamptz not null default now()
);

alter table public.evaluations enable row level security;
alter table public.answer_keys enable row level security;
alter table public.submissions enable row level security;

drop policy if exists "public can read active evaluations" on public.evaluations;
drop policy if exists "owners read evaluations" on public.evaluations;
drop policy if exists "owners insert evaluations" on public.evaluations;
drop policy if exists "owners update evaluations" on public.evaluations;
drop policy if exists "owners delete evaluations" on public.evaluations;
drop policy if exists "owners manage answer keys" on public.answer_keys;
drop policy if exists "anyone can submit active evaluation" on public.submissions;
drop policy if exists "owners read submissions" on public.submissions;
drop policy if exists "owners delete submissions" on public.submissions;
create policy "public can read active evaluations" on public.evaluations for select using (active = true);
create policy "owners read evaluations" on public.evaluations for select to authenticated using (auth.uid() = owner_id);
create policy "owners insert evaluations" on public.evaluations for insert to authenticated with check (auth.uid() = owner_id);
create policy "owners update evaluations" on public.evaluations for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners delete evaluations" on public.evaluations for delete to authenticated using (auth.uid() = owner_id);
create policy "owners manage answer keys" on public.answer_keys for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "anyone can submit active evaluation" on public.submissions for insert to anon, authenticated with check (exists (select 1 from public.evaluations e where e.id = evaluation_id and e.active));
create policy "owners read submissions" on public.submissions for select to authenticated using (exists (select 1 from public.evaluations e where e.id = evaluation_id and e.owner_id = auth.uid()));
create policy "owners delete submissions" on public.submissions for delete to authenticated using (exists (select 1 from public.evaluations e where e.id = evaluation_id and e.owner_id = auth.uid()));

-- Califica en el servidor para que las respuestas correctas nunca lleguen al alumno.
create or replace function public.grade_submission() returns trigger language plpgsql security definer set search_path=public as $$
declare k jsonb; qid text; ans jsonb; expected text;
begin
  select keys into k from public.answer_keys where evaluation_id=new.evaluation_id;
  new.earned:=0;new.total:=0;new.auto_count:=0;
  for qid, ans in select * from jsonb_each(new.answers) loop
    expected:=k->>qid;
    if expected is not null then
      new.total:=new.total+1;new.auto_count:=new.auto_count+1;
      if lower(trim(ans->>'value'))=lower(trim(expected)) then
        new.earned:=new.earned+1;
        new.answers:=jsonb_set(new.answers,array[qid,'correct'],to_jsonb(true),true);
      else
        new.answers:=jsonb_set(new.answers,array[qid,'correct'],to_jsonb(false),true);
      end if;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists grade_before_insert on public.submissions;
create trigger grade_before_insert before insert on public.submissions for each row execute function public.grade_submission();

create or replace function public.touch_evaluation_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now();return new;end $$;
drop trigger if exists touch_evaluation_updated_at on public.evaluations;
create trigger touch_evaluation_updated_at before update on public.evaluations for each row execute function public.touch_evaluation_updated_at();
