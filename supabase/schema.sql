-- ClassTrack Supabase Database Schema

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. Admins Table (linked to auth.users)
create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  created_at timestamp with time zone default now()
);

-- 2. Sessions Table
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins(id) on delete cascade,
  session_name text not null,
  classroom_name text not null,
  radius integer not null, -- radius in meters
  latitude double precision not null,
  longitude double precision not null,
  qr_code text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- 3. Students Table
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  roll_number text not null,
  department text not null,
  created_at timestamp with time zone default now(),
  unique (session_id, roll_number)
);

-- 4. Attendance Table
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  ip_address text,
  user_agent text,
  joined_at timestamp with time zone default now(),
  status text not null default 'Active', -- 'Active', 'Offline'
  unique (session_id, student_id)
);

-- 5. Locations Table (1-to-1 with student for live location updates)
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade unique,
  session_id uuid not null references public.sessions(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  last_seen timestamp with time zone default now(),
  inside_radius boolean not null default true
);

-- Trigger: Automatically sync new auth.users to public.admins
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.admins (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Teacher'),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Recreate trigger to avoid duplicates
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable Row Level Security (RLS) on all tables
alter table public.admins enable row level security;
alter table public.sessions enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;
alter table public.locations enable row level security;

-- RLS Policies for Admins
create policy "Allow all actions for authenticated users on admins"
  on public.admins for all to authenticated using (true);
create policy "Allow read access for admins profile for all"
  on public.admins select to anon using (true);

-- RLS Policies for Sessions
create policy "Allow read access to sessions for everyone"
  on public.sessions select using (true);
create policy "Allow all access to sessions for authenticated admins"
  on public.sessions for all to authenticated using (true);

-- RLS Policies for Students
create policy "Allow read access to students for everyone"
  on public.students select using (true);
create policy "Allow insert access to students for anonymous users"
  on public.students insert to anon with check (true);
create policy "Allow all access to students for authenticated admins"
  on public.students for all to authenticated using (true);

-- RLS Policies for Attendance
create policy "Allow read access to attendance for everyone"
  on public.attendance select using (true);
create policy "Allow insert access to attendance for anonymous users"
  on public.attendance insert to anon with check (true);
create policy "Allow update access to attendance for anonymous users (offline status)"
  on public.attendance update to anon using (true);
create policy "Allow all access to attendance for authenticated admins"
  on public.attendance for all to authenticated using (true);

-- RLS Policies for Locations
create policy "Allow read access to locations for everyone"
  on public.locations select using (true);
create policy "Allow insert/update access to locations for anonymous users"
  on public.locations for all to anon using (true) with check (true);
create policy "Allow all access to locations for authenticated admins"
  on public.locations for all to authenticated using (true);

-- Enable Supabase Realtime for tracking modifications
begin;
  -- remove the tables if they were already added to replication, to prevent errors
  alter publication supabase_realtime drop table if exists public.locations;
  alter publication supabase_realtime drop table if exists public.attendance;
  alter publication supabase_realtime drop table if exists public.students;
  alter publication supabase_realtime drop table if exists public.sessions;
  
  -- add tables to replication
  alter publication supabase_realtime add table public.locations;
  alter publication supabase_realtime add table public.attendance;
  alter publication supabase_realtime add table public.students;
  alter publication supabase_realtime add table public.sessions;
commit;
