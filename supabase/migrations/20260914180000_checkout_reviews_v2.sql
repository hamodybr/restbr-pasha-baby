
begin;
set local lock_timeout='5s';
alter table public.pasha_reviews add column verification_kind text not null default 'purchase' check(verification_kind in ('purchase','order'));
-- Normalize before classifying. Every star value follows the same publication rule.
create function private.pasha_review_publication() returns trigger language plpgsql set search_path='' as $$
begin
 new.comment:=regexp_replace(coalesce(new.comment,''),'^[[:space:]]+|[[:space:]]+$','','g');
 if new.comment='' then new.status:='approved'; else new.status:='pending'; end if;
 return new;
end;$$;
create trigger pasha_review_publication before insert on public.pasha_reviews
for each row execute function private.pasha_review_publication();
create function public.pasha_checkout_review(p_order_id uuid,p_client_token uuid,p_rating integer,p_comment text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; r public.pasha_reviews%rowtype; v_name text;
begin
 if not coalesce((select enabled from public.pasha_review_settings where id),false) then raise exception 'Reviews disabled';end if;
 if p_rating is null or p_rating not between 1 and 5 or char_length(coalesce(p_comment,''))>1000 then raise exception 'Invalid review';end if;
 select * into o from public.orders where id=p_order_id and client_token=p_client_token
 and created_at>now()-interval '24 hours' and status<>'cancelled' for update;
 if not found then raise exception 'Invalid order';end if;
 select * into r from public.pasha_reviews where order_id=o.id;
 if found then return jsonb_build_object('ok',true,'already_submitted',true,'status',r.status);end if;
 v_name:=left(split_part(regexp_replace(trim(o.customer_name),'[[:space:]]+',' ','g'),' ',1),40);
 if coalesce(v_name,'')='' then v_name:='زبون';end if;
 insert into public.pasha_reviews(order_id,first_name,rating,comment,verification_kind)
 values(o.id,v_name,p_rating,coalesce(p_comment,''),'order') returning * into r;
 return jsonb_build_object('ok',true,'already_submitted',false,'status',r.status);
end;$$;
revoke all on function public.pasha_checkout_review(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.pasha_checkout_review(uuid,uuid,integer,text) to anon,authenticated;
create function public.pasha_reviews_dashboard_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not coalesce(private.can_manage_orders(),false) then raise exception 'Forbidden' using errcode='42501';end if;
 return (select jsonb_build_object('count',count(*) filter(where status='approved'),
 'average',round(avg(rating) filter(where status='approved'),1),
 'pending',count(*) filter(where status='pending')) from public.pasha_reviews);
end;$$;
revoke all on function public.pasha_reviews_dashboard_summary() from public,anon,authenticated;
grant execute on function public.pasha_reviews_dashboard_summary() to authenticated;
create or replace function public.pasha_reviews_public(p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_count bigint;v_avg numeric;v_rows jsonb;
begin
 if not coalesce((select enabled from public.pasha_review_settings where id),false) then
 return '{"count":0,"average":null,"reviews":[]}'::jsonb;end if;
 select count(*),round(avg(rating),1) into v_count,v_avg from public.pasha_reviews where status='approved';
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
 select id,first_name,rating,comment,verified_purchase,verification_kind,created_at from public.pasha_reviews
 where status='approved' order by created_at desc,id limit 10 offset greatest(0,least(coalesce(p_offset,0),100000))
 ) r;
 return jsonb_build_object('count',v_count,'average',v_avg,'reviews',v_rows);
end;$$;
commit;
