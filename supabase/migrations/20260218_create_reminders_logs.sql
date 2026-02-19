-- Create table for scheduling reminders
create table if not exists public.medication_reminders (
    id uuid default gen_random_uuid() primary key,
    medication_id uuid references public.medications(id) on delete cascade not null,
    reminder_time time without time zone not null, -- Base time (e.g. '08:00:00')
    frequency_hours integer default 24, -- Interval in hours: 24 (daily), 12, 8, 6, 4
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for reminders
alter table public.medication_reminders enable row level security;

create policy "Users can view their own reminders"
on public.medication_reminders for select
using (
    exists (
        select 1 from public.medications
        where medications.id = medication_reminders.medication_id
        and medications.profile_id = auth.uid()
    )
);

create policy "Users can insert their own reminders"
on public.medication_reminders for insert
with check (
    exists (
        select 1 from public.medications
        where medications.id = medication_reminders.medication_id
        and medications.profile_id = auth.uid()
    )
);

create policy "Users can update their own reminders"
on public.medication_reminders for update
using (
    exists (
        select 1 from public.medications
        where medications.id = medication_reminders.medication_id
        and medications.profile_id = auth.uid()
    )
);

create policy "Users can delete their own reminders"
on public.medication_reminders for delete
using (
    exists (
        select 1 from public.medications
        where medications.id = medication_reminders.medication_id
        and medications.profile_id = auth.uid()
    )
);

-- Create table for tracking medication history (logs)
create table if not exists public.medication_logs (
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
