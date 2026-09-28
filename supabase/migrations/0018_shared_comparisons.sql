-- Share links for competitor comparisons, readable only by their exact slug (same model as 0017).

alter table public.comparisons
  add column is_public boolean not null default false,
  add column share_slug text unique check (share_slug is null or share_slug ~ '^[A-Za-z0-9]{16}$');

create policy "comparisons: update own" on public.comparisons for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant update (is_public, share_slug) on public.comparisons to authenticated;

-- Everything the comparison page needs in one call: the sites with their reports, and the owner's
-- previous comparison of the same site so score changes can be shown.
create or replace function public.get_shared_comparison(p_slug text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'site_url', c.site_url,
    'device', c.device,
    'created_at', c.created_at,
    'sites', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', cs.position, 'url', cs.url, 'status', s.status, 'error', s.error, 'report', r.report
      ) order by cs.position)
      from public.comparison_sites cs
      left join public.scans s on s.id = cs.scan_id
      left join public.scan_results r on r.scan_id = s.id
      where cs.comparison_id = c.id
    ), '[]'::jsonb),
    'previous', (
      select jsonb_build_object(
        'created_at', p.created_at,
        'scores', coalesce((
          select jsonb_agg(jsonb_build_object('url', ps.url, 'score', s2.overall_score))
          from public.comparison_sites ps
          join public.scans s2 on s2.id = ps.scan_id
          where ps.comparison_id = p.id and s2.overall_score is not null
        ), '[]'::jsonb)
      )
      from public.comparisons p
      where p.user_id = c.user_id and p.site_url = c.site_url and p.device = c.device and p.created_at < c.created_at
      order by p.created_at desc
      limit 1
    )
  )
  from public.comparisons c
  where c.share_slug = p_slug and c.is_public;
$$;

revoke execute on function public.get_shared_comparison(text) from public;
grant execute on function public.get_shared_comparison(text) to anon, authenticated;
