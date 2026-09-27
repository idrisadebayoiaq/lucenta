-- The listed developer uses the same username on every social platform.

update public.developers
set x_handle = 'idrisadebayoiaq',
    facebook_handle = 'idrisadebayoiaq',
    instagram_handle = 'idrisadebayoiaq',
    updated_at = now()
where sort_order = 1;
