
-- Deployment script: additive JSON fields; no data or permission changes.
create or replace function public.pasha_reviews_public(p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_count bigint;v_avg numeric;v_rows jsonb;v_hist jsonb;v_comments bigint;
begin
 if not coalesce((select enabled from public.pasha_review_settings where id),false) then
 return '{"count":0,"average":null,"comment_count":0,"distribution":{"1":0,"2":0,"3":0,"4":0,"5":0},"reviews":[]}'::jsonb;end if;
 select count(*),round(avg(rating),1),count(*) filter(where comment<>''),
 jsonb_build_object('1',count(*) filter(where rating=1),'2',count(*) filter(where rating=2),
 '3',count(*) filter(where rating=3),'4',count(*) filter(where rating=4),'5',count(*) filter(where rating=5))
 into v_count,v_avg,v_comments,v_hist from public.pasha_reviews where status='approved';
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
 select id,first_name,rating,comment,verified_purchase,verification_kind,created_at from public.pasha_reviews
 where status='approved' order by created_at desc,id limit 10 offset greatest(0,least(coalesce(p_offset,0),100000))
 ) r;
 return jsonb_build_object('count',v_count,'average',v_avg,'comment_count',v_comments,'distribution',v_hist,'reviews',v_rows);
end;$$;
