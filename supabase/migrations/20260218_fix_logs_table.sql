-- Fix: Recreate medication_logs table to ensure correct schema
-- WARNING: This will delete existing logs history.

DROP TABLE IF EXISTS public.medication_logs;

create table public.medication_logs (
    id uuid default gen_random_uuid() primary key,
    reminder_id uuid references public.medication_reminders(id) on delete set null,
    medication_id uuid references public.medications(id) on delete cascade not null,
    taken_at timestamp with time zone default timezone('utc'::text, now()) not null,
    status text default 'taken' check (status in ('taken', 'skipped')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for logs
alter table public.medication_logs enable row level security;

create policy "Users can view their own logs"
on public.medication_logs for select
using (
    exists (
        select 1 from public.medications
        where medications.id = medication_logs.medication_id
        and medications.profile_id = auth.uid()
    )
);

create policy "Users can insert their own logs"
on public.medication_logs for insert
with check (
    exists (
        select 1 from public.medications
        where medications.id = medication_logs.medication_id
        and medications.profile_id = auth.uid()
    )
);

create policy "Users can update their own logs"
on public.medication_logs for update
using (
    exists (
        select 1 from public.medications
        where medications.id = medication_logs.medication_id
        and medications.profile_id = auth.uid()
    )
);

create policy "Users can delete their own logs"
on public.medication_logs for delete
using (
    exists (
        select 1 from public.medications
        where medications.id = medication_logs.medication_id
        and medications.profile_id = auth.uid()
    )
);
