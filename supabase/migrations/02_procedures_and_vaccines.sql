-- ==============================================================================
-- Migration: 02_procedures_and_vaccines.sql
-- Description: Creates patient_procedures and patient_vaccinations tables with RLS
-- ==============================================================================

-- 1. Patient Procedures Table (Diagnostic studies, endoscopies, imaging, functional tests)
create table if not exists public.patient_procedures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  procedure_name text not null,
  procedure_type text default 'diagnostic',
  date_performed date,
  anatomical_marker text,
  performing_clinician text,
  institution text,
  findings text,
  recall_interval_years numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row-Level Security on Procedures
alter table public.patient_procedures enable row level security;

-- Granular RLS Policies for Procedures
create policy "Users can view their own procedures"
  on public.patient_procedures for select
  using (auth.uid() = user_id);

create policy "Users can insert their own procedures"
  on public.patient_procedures for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own procedures"
  on public.patient_procedures for update
  using (auth.uid() = user_id);

create policy "Users can delete their own procedures"
  on public.patient_procedures for delete
  using (auth.uid() = user_id);


-- 2. Patient Vaccinations Table (Immunizations, boosters, pediatric & adult vaccines)
create table if not exists public.patient_vaccinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  vaccine_name text not null,
  date_administered date,
  dose_number int default 1,
  administering_facility text,
  next_due_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row-Level Security on Vaccinations
alter table public.patient_vaccinations enable row level security;

-- Granular RLS Policies for Vaccinations
create policy "Users can view their own vaccinations"
  on public.patient_vaccinations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own vaccinations"
  on public.patient_vaccinations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own vaccinations"
  on public.patient_vaccinations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own vaccinations"
  on public.patient_vaccinations for delete
  using (auth.uid() = user_id);
