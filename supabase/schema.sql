-- Enable Row Level Security
alter default privileges revoke execute on functions from public;

-- create profiles table
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  primary key (id)
);

alter table public.profiles enable row level security;

create policy "Users can view own profile."
  on profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- create medications table
create table public.medications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  dosage text,
  barcode text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.medications enable row level security;

create policy "Users can view own medications."
  on medications for select
  using ( auth.uid() = user_id );

create policy "Users can insert own medications."
  on medications for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own medications."
  on medications for update
  using ( auth.uid() = user_id );

create policy "Users can delete own medications."
  on medications for delete
  using ( auth.uid() = user_id );

-- create health_logs table
create table public.health_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  systolic integer,
  diastolic integer,
  heart_rate integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.health_logs enable row level security;

create policy "Users can view own health logs."
  on health_logs for select
  using ( auth.uid() = user_id );

create policy "Users can insert own health logs."
  on health_logs for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete own health logs."
  on health_logs for delete
  using ( auth.uid() = user_id );

-- function to handle new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

-- trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
