
-- Additive, disabled by default. Existing order creation and checkout are untouched.
begin;
set local lock_timeout = '5s';
create table public.pasha_review_settings (
 id boolean primary key default true check(id),
 enabled boolean not null default false,
 google_url text not null default ''
 check (google_url = '' or google_url ~ '^https://(search[.]google[.]com/local/writereview[?]placeid=|g[.]page/r/|maps[.]app[.]goo[.]gl/)[A-Za-z0-9_/?=&%.-]+$')
);
insert into public.pasha_review_settings(id) values(true);
create table public.pasha_reviews (
 id uuid primary key default gen_random_uuid(),
 order_id uuid unique references public.orders(id) on delete set null,
 first_name text not null check(char_length(first_name) between 1 and 40 and first_name !~ '[[:space:]]'),
 rating integer not null check(rating between 1 and 5),
 comment text not null default '' check(char_length(comment) <= 1000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 verified_purchase boolean not null default true check(verified_purchase),
 created_at timestamptz not null default now(),
 moderated_at timestamptz,
 moderated_by uuid
);
create index pasha_reviews_public_idx on public.pasha_reviews(created_at desc,id) where status='approved';
create table private.pasha_review_invites (
 order_id uuid primary key references public.orders(id) on delete cascade,
 token uuid not null unique default gen_random_uuid(),
 expires_at timestamptz not null default now() + interval '90 days',
 used_at timestamptz
);
create table private.pasha_review_audit (
 id bigint generated always as identity primary key,
 review_id uuid not null,
 old_status text not null,
 new_status text not null,
 reason text not null,
 actor uuid not null,
 created_at timestamptz not null default now()
);
alter table public.pasha_review_settings enable row level security;
alter table public.pasha_reviews enable row level security;
revoke all on public.pasha_review_settings, public.pasha_reviews from public, anon, authenticated;
revoke all on private.pasha_review_invites, private.pasha_review_audit from public, anon, authenticated;
grant select on public.pasha_reviews to authenticated;
create policy pasha_reviews_admin_read on public.pasha_reviews for select to authenticated
 using ((select private.can_manage_orders()));
-- Browser roles have no direct writes or access to invitation tokens.
create function public.pasha_reviews_config()
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('enabled',enabled,'google_url',google_url) from public.pasha_review_settings where id;
$$;
create function public.pasha_reviews_settings(p_enabled boolean,p_google_url text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not coalesce(private.can_manage_orders(),false) then raise exception 'Forbidden' using errcode='42501'; end if;
 update public.pasha_review_settings set enabled=p_enabled,google_url=trim(coalesce(p_google_url,'')) where id;
end; $$;
create function public.pasha_reviews_invite(p_order_number text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_order uuid; v_token uuid;
begin
 if not coalesce(private.can_manage_orders(),false) then raise exception 'Forbidden' using errcode='42501'; end if;
 select id into v_order from public.orders where order_number=trim(p_order_number) and status='completed' for update;
 if v_order is null then raise exception 'Completed order required'; end if;
 if exists(select 1 from public.pasha_reviews where order_id=v_order) then raise exception 'Already reviewed'; end if;
 insert into private.pasha_review_invites(order_id) values(v_order)
 on conflict(order_id) do update set
 token=case when private.pasha_review_invites.expires_at<=now() then gen_random_uuid() else private.pasha_review_invites.token end,
 expires_at=case when private.pasha_review_invites.expires_at<=now() then now()+interval '90 days' else private.pasha_review_invites.expires_at end
 returning token into v_token;
 return v_token;
end; $$;
create function public.pasha_reviews_submit(p_token uuid,p_first_name text,p_rating integer,p_comment text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_invite private.pasha_review_invites%rowtype; v_name text;
begin
 if not coalesce((select enabled from public.pasha_review_settings where id),false) then raise exception 'Reviews disabled'; end if;
 v_name:=trim(coalesce(p_first_name,''));
 if char_length(v_name) not between 1 and 40 or v_name ~ '[[:space:]]'
 or p_rating is null or p_rating not between 1 and 5 or char_length(coalesce(p_comment,''))>1000
 then raise exception 'Invalid review'; end if;
 select * into v_invite from private.pasha_review_invites where token=p_token;
 if not found or v_invite.expires_at<=now() then raise exception 'Invalid or expired invitation'; end if;
 -- Serialize against status changes/deletion, and never accept cancelled/unfulfilled purchases.
 perform 1 from public.orders where id=v_invite.order_id and status='completed' for update;
 if not found then raise exception 'Invalid or expired invitation'; end if;
 select * into v_invite from private.pasha_review_invites where token=p_token for update;
 if not found or v_invite.expires_at<=now() then raise exception 'Invalid or expired invitation'; end if;
 if v_invite.used_at is not null then return '{"ok":true,"already_submitted":true}'::jsonb; end if;
 insert into public.pasha_reviews(order_id,first_name,rating,comment)
 values(v_invite.order_id,v_name,p_rating,trim(coalesce(p_comment,'')));
 update private.pasha_review_invites set used_at=now() where order_id=v_invite.order_id;
 return '{"ok":true,"already_submitted":false}'::jsonb;
end; $$;
create function public.pasha_reviews_moderate(p_id uuid,p_status text,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare v_old text;
begin
 if not coalesce(private.can_manage_orders(),false) then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_status is null or p_status not in ('pending','approved','rejected') then raise exception 'Invalid status'; end if;
 if char_length(trim(coalesce(p_reason,''))) not between 1 and 300 then raise exception 'Reason required'; end if;
 select status into v_old from public.pasha_reviews where id=p_id for update;
 if not found then raise exception 'Review not found'; end if;
 update public.pasha_reviews set status=p_status,moderated_at=now(),moderated_by=auth.uid() where id=p_id;
 insert into private.pasha_review_audit(review_id,old_status,new_status,reason,actor)
 values(p_id,v_old,p_status,trim(p_reason),auth.uid());
end; $$;
create function public.pasha_reviews_public(p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_count bigint; v_avg numeric; v_rows jsonb;
begin
 if not coalesce((select enabled from public.pasha_review_settings where id),false) then
 return '{"count":0,"average":null,"reviews":[]}'::jsonb; end if;
 select count(*),round(avg(rating),1) into v_count,v_avg from public.pasha_reviews where status='approved';
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
 select id,first_name,rating,comment,verified_purchase,created_at from public.pasha_reviews
 where status='approved' order by created_at desc,id limit 10 offset greatest(0,least(coalesce(p_offset,0),100000))
 ) r;
 return jsonb_build_object('count',v_count,'average',v_avg,'reviews',v_rows);
end; $$;
revoke all on function public.pasha_reviews_config(), public.pasha_reviews_public(integer),
 public.pasha_reviews_submit(uuid,text,integer,text),public.pasha_reviews_settings(boolean,text),
 public.pasha_reviews_invite(text),public.pasha_reviews_moderate(uuid,text,text) from public,anon,authenticated;
grant execute on function public.pasha_reviews_config(),public.pasha_reviews_public(integer),
 public.pasha_reviews_submit(uuid,text,integer,text) to anon,authenticated;
grant execute on function public.pasha_reviews_settings(boolean,text),public.pasha_reviews_invite(text),
 public.pasha_reviews_moderate(uuid,text,text) to authenticated;
commit;
