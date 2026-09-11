-- ==============================================================================
-- COMPREHENSIVE SUPABASE SCHEMA MIGRATION FOR ANATOMICAL PMHX
-- File: supabase/migrations/01_complete_patient_schema.sql
-- 
-- Instructions:
-- 1. Open your Supabase Project Dashboard: https://supabase.com/dashboard
-- 2. Click on "SQL Editor" in the left navigation sidebar.
-- 3. Click "+ New Query".
-- 4. Paste this ENTIRE script and click "Run" (or CMD+Enter / CTRL+Enter).
--
-- This script is completely IDEMPOTENT: safe to run multiple times.
-- It ensures all 6 tables exist with resilient TEXT date columns,
-- TEXT primary keys, CASCADE deletion on auth.users, and strict RLS policies.
-- ==============================================================================

-- 1. Patient Profile Table
create table if not exists public.patient_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Patient',
  dob text,
  age int,
  sex text default 'female',
  build text default 'medium',
  skin_tone text default '#d4a373',
  mrn text,
  pcp text,
  pcp_phone text,
  clinic text,
  emergency_contact text,
  emergency_contact_name text,
  emergency_contact_first_name text,
  emergency_contact_last_name text,
  emergency_contact_relation text,
  emergency_contact_phone text,
  allergies text,
  phone text,
  email text,
  address text,
  pharmacy jsonb,
  blood_type text default 'I don''t know',
  preferred_language text default 'English',
  veteran_status text default 'No',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure user_id is unique on patient_profile for upserting
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'patient_profile_user_id_key'
  ) then
    alter table public.patient_profile add constraint patient_profile_user_id_key unique (user_id);
  end if;
end $$;

-- Alter dob to text if it was previously created as date
alter table public.patient_profile alter column dob type text using dob::text;
alter table public.patient_profile add column if not exists address text;
alter table public.patient_profile add column if not exists pharmacy jsonb;
alter table public.patient_profile add column if not exists emergency_contact_first_name text;
alter table public.patient_profile add column if not exists emergency_contact_last_name text;

-- 2. Patient Conditions Table
create table if not exists public.patient_conditions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  region text,
  icd10 text,
  onset_date text,
  status text not null default 'Active',
  provider text,
  facility text,
  laterality text,
  coords jsonb not null default '{"x": 0, "y": 3.5, "z": 1.0}'::jsonb,
  system text default 'general',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure onset_date is text to support years (e.g. "2024", "06/2026", "N/A")
alter table public.patient_conditions alter column onset_date type text using onset_date::text;
alter table public.patient_conditions add column if not exists facility text;
alter table public.patient_conditions add column if not exists laterality text;

-- 3. Patient Surgeries Table
create table if not exists public.patient_surgeries (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  site text,
  surgery_date text,
  hospital text,
  surgeon text,
  incision text,
  coords jsonb not null default '{"x": 0, "y": 3.0, "z": 1.0}'::jsonb,
  system text default 'general',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure surgery_date is text
alter table public.patient_surgeries alter column surgery_date type text using surgery_date::text;

-- 4. Patient Medications Table
create table if not exists public.patient_medications (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  dosage text,
  route text default 'Oral (PO)',
  frequency text default 'Once Daily',
  indication text,
  start_date text,
  prescriber text,
  last_picked_up_date text,
  last_picked_up_pharmacy text,
  days_supply text,
  quantity_amount text,
  refills_remaining int default 0,
  rx_number text,
  system text default 'general',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure start_date is text and dispensing columns exist
alter table public.patient_medications alter column start_date type text using start_date::text;
alter table public.patient_medications add column if not exists last_picked_up_date text;
alter table public.patient_medications add column if not exists last_picked_up_pharmacy text;
alter table public.patient_medications add column if not exists days_supply text;
alter table public.patient_medications add column if not exists quantity_amount text;
alter table public.patient_medications add column if not exists refills_remaining int default 0;
alter table public.patient_medications add column if not exists rx_number text;

-- 5. Patient Procedures Table (Diagnostic studies, endoscopies, imaging, functional tests)
create table if not exists public.patient_procedures (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  procedure_name text not null,
  procedure_type text default 'diagnostic',
  date_performed text,
  anatomical_marker text,
  performing_clinician text,
  institution text,
  findings text,
  recall_interval_years numeric,
  coords jsonb default '{"x": 0.1, "y": 1.8, "z": 1.05}'::jsonb,
  system text default 'general',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure id & date_performed are text
alter table public.patient_procedures alter column id type text using id::text;
alter table public.patient_procedures alter column date_performed type text using date_performed::text;

-- 6. Patient Vaccinations Table (Immunizations, boosters, pediatric & adult vaccines)
create table if not exists public.patient_vaccinations (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  vaccine_name text not null,
  date_administered text,
  dose_number int default 1,
  administering_facility text,
  lot_number text,
  next_due_date text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure id & date fields are text
alter table public.patient_vaccinations alter column id type text using id::text;
alter table public.patient_vaccinations alter column date_administered type text using date_administered::text;
alter table public.patient_vaccinations alter column next_due_date type text using next_due_date::text;

-- ==============================================================================
-- INDEXES FOR FAST QUERYING
-- ==============================================================================
create index if not exists idx_patient_profile_user_id on public.patient_profile(user_id);
create index if not exists idx_patient_conditions_user_id on public.patient_conditions(user_id);
create index if not exists idx_patient_surgeries_user_id on public.patient_surgeries(user_id);
create index if not exists idx_patient_medications_user_id on public.patient_medications(user_id);
create index if not exists idx_patient_procedures_user_id on public.patient_procedures(user_id);
create index if not exists idx_patient_vaccinations_user_id on public.patient_vaccinations(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures each authenticated user can ONLY access and modify their own records.
-- ==============================================================================

alter table public.patient_profile enable row level security;
alter table public.patient_conditions enable row level security;
alter table public.patient_surgeries enable row level security;
alter table public.patient_medications enable row level security;
alter table public.patient_procedures enable row level security;
alter table public.patient_vaccinations enable row level security;

-- Profile RLS
drop policy if exists "Users can manage own profile" on public.patient_profile;
create policy "Users can manage own profile" on public.patient_profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Conditions RLS
drop policy if exists "Users can manage own conditions" on public.patient_conditions;
create policy "Users can manage own conditions" on public.patient_conditions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Surgeries RLS
drop policy if exists "Users can manage own surgeries" on public.patient_surgeries;
create policy "Users can manage own surgeries" on public.patient_surgeries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Medications RLS
drop policy if exists "Users can manage own medications" on public.patient_medications;
create policy "Users can manage own medications" on public.patient_medications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Procedures RLS
drop policy if exists "Users can manage own procedures" on public.patient_procedures;
drop policy if exists "Users can view their own procedures" on public.patient_procedures;
drop policy if exists "Users can insert their own procedures" on public.patient_procedures;
drop policy if exists "Users can update their own procedures" on public.patient_procedures;
drop policy if exists "Users can delete their own procedures" on public.patient_procedures;
create policy "Users can manage own procedures" on public.patient_procedures
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Vaccinations RLS
drop policy if exists "Users can manage own vaccinations" on public.patient_vaccinations;
drop policy if exists "Users can view their own vaccinations" on public.patient_vaccinations;
drop policy if exists "Users can insert their own vaccinations" on public.patient_vaccinations;
drop policy if exists "Users can update their own vaccinations" on public.patient_vaccinations;
drop policy if exists "Users can delete their own vaccinations" on public.patient_vaccinations;
create policy "Users can manage own vaccinations" on public.patient_vaccinations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
