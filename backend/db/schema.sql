-- ============================================================================
-- ARGO Float AI — Production Schema  (PostgreSQL 17 / Supabase)
-- Run this ENTIRE file once in the Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / ON CONFLICT.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists postgis;        -- geography / spatial queries
create extension if not exists vector;         -- pgvector (knowledge RAG)
create extension if not exists pg_trgm;        -- fuzzy text search
-- create extension if not exists pg_cron;     -- optional: partition automation

-- ---------------------------------------------------------------------------
-- 2. Schemas
-- ---------------------------------------------------------------------------
create schema if not exists argo;   -- domain data (queried by the SQL agent)
create schema if not exists app;    -- application state (history, saved items)

-- ===========================================================================
-- 3. REFERENCE / DICTIONARY TABLES  (small; also the seed for knowledge RAG)
-- ===========================================================================
create table if not exists argo.data_modes (
  code        char(1) primary key,
  name        text not null,
  description text not null
);
insert into argo.data_modes (code, name, description) values
  ('R','Real-time','Data delivered in real time; automatic QC only, values not adjusted.'),
  ('A','Adjusted','Real-time data with adjustments applied in real time (e.g. pressure correction).'),
  ('D','Delayed-mode','Data examined by a scientific expert; best-quality, calibrated and adjusted.')
on conflict (code) do nothing;

create table if not exists argo.qc_flags (
  flag        char(1) primary key,
  name        text not null,
  description text not null,
  is_usable   boolean not null
);
insert into argo.qc_flags (flag, name, description, is_usable) values
  ('0','No QC','No quality control performed.', false),
  ('1','Good','Good data; passed all tests.', true),
  ('2','Probably good','Probably good data.', true),
  ('3','Probably bad','Probably bad data; potentially correctable.', false),
  ('4','Bad','Bad data.', false),
  ('5','Changed','Value changed during QC.', true),
  ('8','Interpolated','Estimated/interpolated value.', true),
  ('9','Missing','Missing value.', false)
on conflict (flag) do nothing;

create table if not exists argo.parameters (
  code        text primary key,
  long_name   text not null,
  unit        text,
  param_group text not null default 'core',   -- 'core' | 'bgc'
  description text
);
insert into argo.parameters (code, long_name, unit, param_group, description) values
  ('PRES','Sea water pressure','decibar','core','Pressure = depth proxy; ~1 dbar per metre.'),
  ('TEMP','Sea temperature in-situ (ITS-90)','degree_Celsius','core','In-situ water temperature.'),
  ('PSAL','Practical salinity','psu','core','Practical salinity derived from conductivity, temp, pressure.'),
  ('CNDC','Electrical conductivity','mhos/m','core','Raw conductivity used to derive salinity.'),
  ('DOXY','Dissolved oxygen','micromole/kg','bgc','Dissolved oxygen concentration (BGC-Argo).'),
  ('CHLA','Chlorophyll-a','mg/m3','bgc','Chlorophyll-a concentration (BGC-Argo).'),
  ('BBP700','Backscattering at 700nm','1/m','bgc','Particle backscattering (BGC-Argo).'),
  ('NITRATE','Nitrate','micromole/kg','bgc','Nitrate concentration (BGC-Argo).'),
  ('PH_IN_SITU_TOTAL','pH in situ (total scale)',NULL,'bgc','Seawater pH (BGC-Argo).')
on conflict (code) do nothing;

-- IHO ocean / basin polygons (load separately; region_id may stay NULL until then)
create table if not exists argo.ocean_regions (
  region_id serial primary key,
  name      text not null,
  geom      geography(MultiPolygon,4326) not null
);
create index if not exists idx_ocean_regions_geom on argo.ocean_regions using gist (geom);

-- ===========================================================================
-- 4. INGESTION TRACKING
-- ===========================================================================
create table if not exists argo.files (
  file_id             uuid primary key default gen_random_uuid(),
  file_name           text not null,
  source_url          text,
  data_type           text,
  format_version      text,
  handbook_version    text,
  reference_date_time timestamptz,
  date_creation       timestamptz,
  date_update         timestamptz,
  data_centre         text,
  float_count         int,
  profile_count       int,
  content_hash        text,
  ingested_at         timestamptz not null default now(),
  unique (file_name, content_hash)
);

-- ===========================================================================
-- 5. FLOATS  (platform-level — one row per WMO float)
-- ===========================================================================
create table if not exists argo.floats (
  platform_number text primary key,
  platform_type   text,
  pi_name         text,
  project_name    text,
  data_centre     text,
  float_type      text not null default 'core',   -- 'core' | 'bgc'
  deploy_date     timestamptz,
  deploy_geom     geography(Point,4326),
  first_cycle_at  timestamptz,
  last_cycle_at   timestamptz,
  n_cycles        int default 0,
  is_active       boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists idx_floats_deploy_geom on argo.floats using gist (deploy_geom);
create index if not exists idx_floats_pi_trgm      on argo.floats using gin (pi_name gin_trgm_ops);

-- ===========================================================================
-- 6. PROFILES  (partitioned by time; PostGIS point; surrogate PK)
-- ===========================================================================
create table if not exists argo.profiles (
  profile_id       bigint generated always as identity,
  platform_number  text not null references argo.floats(platform_number) on delete cascade,
  cycle_number     int  not null,
  direction        char(1) not null default 'A',
  file_id          uuid references argo.files(file_id) on delete set null,

  juld             timestamptz,
  profile_date     date not null,                 -- partition key
  latitude         double precision,
  longitude        double precision,
  geom             geography(Point,4326),
  region_id        int references argo.ocean_regions(region_id),

  position_qc      char(1),
  juld_qc          char(1),
  data_mode        char(1),
  has_adjusted     boolean default false,
  positioning_system text,
  vertical_sampling_scheme text,
  config_mission_number int,
  n_levels         int,
  max_pres         double precision,
  created_at       timestamptz default now(),

  primary key (profile_id, profile_date),
  unique (platform_number, cycle_number, direction, profile_date)
) partition by range (profile_date);

-- DEFAULT partition catches any date; yearly partitions added below for speed.
create table if not exists argo.profiles_default partition of argo.profiles default;

do $$
declare y int;
begin
  for y in 2000..2030 loop
    execute format(
      'create table if not exists argo.profiles_%s partition of argo.profiles for values from (%L) to (%L)',
      y, make_date(y,1,1), make_date(y+1,1,1));
  end loop;
end $$;

create index if not exists idx_profiles_geom   on argo.profiles using gist (geom);
create index if not exists idx_profiles_juld   on argo.profiles (juld);
create index if not exists idx_profiles_float  on argo.profiles (platform_number, cycle_number);
create index if not exists idx_profiles_region on argo.profiles (region_id);

-- Auto-fill geom + region + profile_date fallback on insert/update
create or replace function argo.profiles_geom_region() returns trigger as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.geom := ST_SetSRID(ST_MakePoint(new.longitude, new.latitude),4326)::geography;
    select r.region_id into new.region_id
      from argo.ocean_regions r
      where ST_Intersects(r.geom, new.geom)
      limit 1;
  end if;
  if new.profile_date is null then
    new.profile_date := coalesce(new.juld::date, date '1900-01-01');
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists trg_profiles_geom on argo.profiles;
create trigger trg_profiles_geom before insert or update on argo.profiles
  for each row execute function argo.profiles_geom_region();

-- ===========================================================================
-- 7. PER-PARAMETER STATS  (long format — scales to BGC without schema change)
-- ===========================================================================
create table if not exists argo.profile_param_stats (
  profile_id   bigint not null,
  profile_date date   not null,
  parameter    text   not null references argo.parameters(code),
  min_value    double precision,
  max_value    double precision,
  mean_value   double precision,
  n_valid      int,
  profile_qc   char(1),
  primary key (profile_id, profile_date, parameter),
  foreign key (profile_id, profile_date)
    references argo.profiles(profile_id, profile_date) on delete cascade
);
create index if not exists idx_pps_param on argo.profile_param_stats (parameter, mean_value);

-- ===========================================================================
-- 8. TRAJECTORY  (surface positions; one point per profile from *_prof.nc)
-- ===========================================================================
create table if not exists argo.trajectory (
  id               bigint generated always as identity,
  platform_number  text not null references argo.floats(platform_number) on delete cascade,
  cycle_number     int,
  ts               timestamptz not null,
  ts_date          date not null,
  latitude         double precision,
  longitude        double precision,
  geom             geography(Point,4326),
  position_qc      char(1),
  positioning_system text,
  file_id          uuid references argo.files(file_id) on delete set null,
  primary key (id, ts_date),
  unique (platform_number, cycle_number, ts_date)
) partition by range (ts_date);

create table if not exists argo.trajectory_default partition of argo.trajectory default;
do $$
declare y int;
begin
  for y in 2000..2030 loop
    execute format(
      'create table if not exists argo.trajectory_%s partition of argo.trajectory for values from (%L) to (%L)',
      y, make_date(y,1,1), make_date(y+1,1,1));
  end loop;
end $$;

create index if not exists idx_traj_geom  on argo.trajectory using gist (geom);
create index if not exists idx_traj_float on argo.trajectory (platform_number, ts);

create or replace function argo.trajectory_geom() returns trigger as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.geom := ST_SetSRID(ST_MakePoint(new.longitude, new.latitude),4326)::geography;
  end if;
  if new.ts_date is null then new.ts_date := coalesce(new.ts::date, date '1900-01-01'); end if;
  return new;
end $$ language plpgsql;

drop trigger if exists trg_traj_geom on argo.trajectory;
create trigger trg_traj_geom before insert or update on argo.trajectory
  for each row execute function argo.trajectory_geom();

-- ===========================================================================
-- 9. CALIBRATION & HISTORY  (correct composite FKs)
-- ===========================================================================
create table if not exists argo.calibration_info (
  id               bigint generated always as identity primary key,
  profile_id       bigint not null,
  profile_date     date   not null,
  parameter        text,
  parameter_sensor text,
  calib_equation   text,
  calib_coefficients jsonb,
  calib_comment    text,
  calib_date       timestamptz,
  foreign key (profile_id, profile_date)
    references argo.profiles(profile_id, profile_date) on delete cascade,
  unique (profile_id, profile_date, parameter)
);

create table if not exists argo.history_info (
  id               bigint generated always as identity primary key,
  profile_id       bigint not null,
  profile_date     date   not null,
  history_institution text,
  history_step        text,
  history_software    text,
  history_software_release text,
  history_reference   text,
  history_date        timestamptz,
  history_action      text,
  history_parameter   text,
  history_start_pres  double precision,
  history_stop_pres   double precision,
  history_previous_value text,
  history_qctest      text,
  foreign key (profile_id, profile_date)
    references argo.profiles(profile_id, profile_date) on delete cascade
);

-- ===========================================================================
-- 10. PARQUET MANIFEST  (bulk arrays live in Parquet, queried by DuckDB)
-- ===========================================================================
create table if not exists argo.profile_parquet_index (
  profile_id     bigint not null,
  profile_date   date   not null,
  parquet_uri    text   not null,
  row_count      bigint,
  min_pres       double precision,
  max_pres       double precision,
  max_depth      double precision,
  variables      jsonb,
  file_size_bytes bigint,
  storage_status text default 'uploaded',
  created_at     timestamptz default now(),
  primary key (profile_id, profile_date),
  foreign key (profile_id, profile_date)
    references argo.profiles(profile_id, profile_date) on delete cascade
);

-- ===========================================================================
-- 11. KNOWLEDGE RAG  (embed KNOWLEDGE, not metadata rows)
-- ===========================================================================
create table if not exists argo.knowledge_docs (
  id         bigint generated always as identity primary key,
  source     text not null,                 -- 'handbook'|'param_def'|'qc_def'|'data_mode_def'|'schema_doc'
  title      text not null,
  content    text not null,
  embedding  vector(384),                   -- all-MiniLM-L6-v2
  metadata   jsonb,
  created_at timestamptz default now(),
  unique (source, title)
);
create index if not exists idx_knowledge_embedding on argo.knowledge_docs
  using hnsw (embedding vector_cosine_ops);

-- Few-shot NL->SQL examples (retrieved before generating SQL)
create table if not exists argo.sql_examples (
  id         bigint generated always as identity primary key,
  nl_question text not null,
  sql         text not null,
  tags        text[],
  embedding   vector(384),
  created_at  timestamptz default now(),
  unique (nl_question)
);
create index if not exists idx_sqlex_embedding on argo.sql_examples
  using hnsw (embedding vector_cosine_ops);

-- ===========================================================================
-- 12. APPLICATION STATE
-- ===========================================================================
create table if not exists public.profiles (          -- user profile (Supabase auth)
  id         uuid primary key references auth.users(id),
  email      text,
  full_name  text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists app.query_history (
  id            bigint generated always as identity primary key,
  user_id       uuid,
  nl_query      text not null,
  refined_query text,
  intent        text,
  generated_sql text,
  row_count     int,
  status        text,
  latency_ms    int,
  created_at    timestamptz default now()
);
create index if not exists idx_qh_user on app.query_history (user_id, created_at desc);

create table if not exists app.saved_items (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  kind       text not null,
  title      text,
  payload    jsonb not null,
  created_at timestamptz default now()
);

-- ===========================================================================
-- 13. READ-ONLY ROLE FOR THE SQL AGENT  (defense in depth)
--   Optional but recommended. Set a real password, then use this role's
--   connection string as DATABASE_URL_READONLY for the runtime SQL executor.
-- ===========================================================================
-- do $$ begin
--   if not exists (select 1 from pg_roles where rolname='argo_agent') then
--     create role argo_agent login password 'CHANGE_ME';
--   end if;
-- end $$;
-- grant usage on schema argo to argo_agent;
-- grant select on all tables in schema argo to argo_agent;
-- alter default privileges in schema argo grant select to argo_agent;
-- alter role argo_agent set statement_timeout = '5s';
-- alter role argo_agent set default_transaction_read_only = on;

-- ============================================================================
-- DONE.
-- ============================================================================
