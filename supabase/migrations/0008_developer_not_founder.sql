-- List the seeded developer as a regular developer, without founder details.
update public.developers
set headline = 'Full Stack Developer',
    is_owner = false
where is_owner = true;
