import { createClient } from "@supabase/supabase-js";

// Helper functions to normalize and clean Supabase URL and keys
export function normalizeSupabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let clean = rawUrl.trim().replace(/^["']|["']$/g, "").trim();

  // If user pasted dashboard URL: https://supabase.com/dashboard/project/<project-ref>
  const dashboardMatch = clean.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Ensure protocol
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `https://${clean}`;
  }

  try {
    const parsed = new URL(clean);
    // Project URL must be protocol + host ONLY (e.g. https://xyz.supabase.co)
    // Strip all pathnames (like /rest/v1, /auth/v1, /graphql, trailing slashes)
    return `${parsed.protocol}//${parsed.host}`;
  } catch (e) {
    // Fallback regex: remove any trailing slashes, /rest/v1, /auth/v1, etc.
    return clean
      .replace(/\/rest\/v1.*$/i, "")
      .replace(/\/auth\/v1.*$/i, "")
      .replace(/\/graphql.*$/i, "")
      .replace(/\/+$/, "");
  }
}

export function normalizeSupabaseKey(rawKey) {
  if (!rawKey || typeof rawKey !== "string") return "";
  return rawKey.trim().replace(/^["']|["']$/g, "").trim();
}

// Retrieve config from env or localStorage with strict URL sanitization
const getSavedConfig = () => {
  try {
    const customUrl = localStorage.getItem("pmhx_supabase_url");
    const customKey = localStorage.getItem("pmhx_supabase_anon_key");
    const rawUrl = customUrl || import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
    const rawKey = customKey || import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

    const url = normalizeSupabaseUrl(rawUrl) || "https://your-project.supabase.co";
    const key = normalizeSupabaseKey(rawKey) || "your-anon-key";

    // Auto-heal localStorage if the saved URL or key had paths or formatting errors
    if (customUrl && customUrl !== url) {
      localStorage.setItem("pmhx_supabase_url", url);
    }
    if (customKey && customKey !== key) {
      localStorage.setItem("pmhx_supabase_anon_key", key);
    }

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
    key !== "your-anon-key" &&
    key.length > 20
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
    const cleanUrl = normalizeSupabaseUrl(url);
    const cleanKey = normalizeSupabaseKey(anonKey);
    localStorage.setItem("pmhx_supabase_url", cleanUrl);
    localStorage.setItem("pmhx_supabase_anon_key", cleanKey);
    supabase = createClient(cleanUrl, cleanKey, {
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
  try {
    localStorage.removeItem("pmhx_supabase_url");
    localStorage.removeItem("pmhx_supabase_anon_key");
  } catch (_) {}
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

-- 5. Patient Procedures Table (Diagnostic studies, endoscopies, imaging)
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

-- 6. Patient Vaccinations Table (Immunizations & boosters)
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

-- Row Level Security (RLS) Policies
alter table public.patient_profile enable row level security;
alter table public.patient_conditions enable row level security;
alter table public.patient_surgeries enable row level security;
alter table public.patient_medications enable row level security;
alter table public.patient_procedures enable row level security;
alter table public.patient_vaccinations enable row level security;

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

-- Procedures Policies
create policy "Users can manage own procedures" on public.patient_procedures
  for all using (auth.uid() = user_id);

-- Vaccinations Policies
create policy "Users can manage own vaccinations" on public.patient_vaccinations
  for all using (auth.uid() = user_id);
`;
