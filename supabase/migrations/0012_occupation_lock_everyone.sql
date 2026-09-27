-- Occupation can be changed at most once every 30 days, whatever it is (previously only students were locked).

create or replace function public.enforce_profile_rules()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.birth_date is distinct from old.birth_date then
    if old.birth_date is not null then
      raise exception 'Your date of birth can''t be changed.' using errcode = 'P0001';
    end if;
    if new.birth_date > (current_date - interval '16 years')::date then
      raise exception 'You must be at least 16 years old to use Lucenta.' using errcode = 'P0001';
    end if;
  end if;

  if new.occupation is distinct from old.occupation then
    if old.occupation is not null
       and old.occupation_updated_at > now() - interval '30 days' then
      raise exception 'occupation_locked' using errcode = 'P0001';
    end if;
    new.occupation_updated_at := now();
  else
    new.occupation_updated_at := old.occupation_updated_at;
  end if;

  if new.referral_source is distinct from 'other' then
    new.referral_other := null;
  end if;

  return new;
end;
$$;
