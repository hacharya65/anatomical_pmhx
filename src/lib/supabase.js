import { createClient } from "@supabase/supabase-js";

// Retrieve config from env or localStorage
const getSavedConfig = () => {
  try {
    const customUrl = localStorage.getItem("pmhx_supabase_url");
    const customKey = localStorage.getItem("pmhx_supabase_anon_key");
    const url = customUrl || import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
    const key = customKey || import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";
    return { url, key, isCustom: !!customUrl };
  } catch (e) {
    return {
      url: "https://your-project.supabase.co",
      key: "your-anon-key",
      isCustom: false
    };
  }
};

export const isSupabaseConfigured = () => {
  const { url, key } = getSavedConfig();
  return (
    url &&
    url !== "https://your-project.supabase.co" &&
    key &&
    key !== "your-anon-key"
  );
};

const config = getSavedConfig();

export let supabase = createClient(config.url, config.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export const reinitializeSupabase = (url, anonKey) => {
  if (url && anonKey) {
    localStorage.setItem("pmhx_supabase_url", url);
    localStorage.setItem("pmhx_supabase_anon_key", anonKey);
    supabase = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
    return true;
  }
  return false;
};

export const resetSupabaseConfig = () => {
  localStorage.removeItem("pmhx_supabase_url");
  localStorage.removeItem("pmhx_supabase_anon_key");
  const fallback = getSavedConfig();
  supabase = createClient(fallback.url, fallback.key);
};

export const SUPABASE_SQL_SCHEMA = `-- PostgreSQL / Supabase Schema for anatomical_pmhx

-- 1. Patient Profile Table
create table if not exists public.patient_profile (
  id uuid primary key default auth.uid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null default 'Elena Vance',
  dob date not null default '1968-04-12',
  age int not null default 58,
  sex text not null default 'female',
  build text not null default 'medium',
  skin_tone text not null default '#d4a373',
  mrn text not null default '#PMHX-84920',
  pcp text,
  emergency_contact text,
  allergies text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Patient Conditions Table
create table if not exists public.patient_conditions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  region text,
  icd10 text,
  onset_date date,
  status text not null default 'Active',
  provider text,
  coords jsonb not null,
  system text default 'general',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Patient Surgeries Table
create table if not exists public.patient_surgeries (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  site text,
  surgery_date date,
  hospital text,
  surgeon text,
  incision text,
  coords jsonb not null,
  system text default 'general',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Patient Medications Table
create table if not exists public.patient_medications (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  dosage text,
  route text,
  frequency text,
  indication text,
  start_date date,
  prescriber text,
  system text default 'general',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) Policies
alter table public.patient_profile enable row level security;
alter table public.patient_conditions enable row level security;
alter table public.patient_surgeries enable row level security;
alter table public.patient_medications enable row level security;

-- Profile Policies
create policy "Users can manage own profile" on public.patient_profile
  for all using (auth.uid() = user_id);

-- Conditions Policies
create policy "Users can manage own conditions" on public.patient_conditions
  for all using (auth.uid() = user_id);

-- Surgeries Policies
create policy "Users can manage own surgeries" on public.patient_surgeries
  for all using (auth.uid() = user_id);

-- Medications Policies
create policy "Users can manage own medications" on public.patient_medications
  for all using (auth.uid() = user_id);
`;
