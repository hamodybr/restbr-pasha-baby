
\set ON_ERROR_STOP on
set test.uid='11111111-1111-4111-8111-111111111111';
set test.manager='yes';
select public.pasha_reviews_invite('PB-TEST-1') as token \gset
do $$begin
 begin perform public.pasha_reviews_invite('PB-TEST-2'); raise exception 'TEST: accepted incomplete order'; exception when others then if sqlerrm like 'TEST:%' then raise; end if; end;
 if (public.pasha_reviews_config()->>'enabled')::boolean then raise exception 'Enabled by default'; end if;
end$$;
select public.pasha_reviews_settings(true,'');
set role anon;
select public.pasha_reviews_submit(:'token','Sara',1,'<img src=x onerror=alert(1)>');
select public.pasha_reviews_submit(:'token','Sara',5,'Duplicate');
do $$begin
 if (public.pasha_reviews_public()->>'count')::int<>0 then raise exception 'Pending review exposed'; end if;
 begin perform * from public.pasha_reviews; raise exception 'TEST: anon read table'; exception when insufficient_privilege then null; end;
 begin perform public.pasha_reviews_invite('PB-TEST-3'); raise exception 'TEST: anon invite'; exception when insufficient_privilege then null; end;
 begin perform public.pasha_reviews_submit(gen_random_uuid(),'Sara',3,''); raise exception 'TEST: invalid token'; exception when others then if sqlerrm like 'TEST:%' then raise; end if; end;
end$$;
reset role;
do $$begin if (select count(*) from public.pasha_reviews)<>1 then raise exception 'Duplicate accepted'; end if;end$$;
select id as review_id from public.pasha_reviews \gset
set role authenticated;
set test.manager='no';
do $$begin
 if exists(select 1 from public.pasha_reviews) then raise exception 'Unauthorized read'; end if;
 begin perform public.pasha_reviews_settings(false,''); raise exception 'TEST: unauthorized settings'; exception when insufficient_privilege then null; end;
 begin insert into public.pasha_reviews(first_name,rating) values('Fake',5); raise exception 'TEST: direct write'; exception when insufficient_privilege then null; end;
end$$;
set test.manager='yes';
select public.pasha_reviews_moderate(:'review_id','approved','Content is relevant');
set role anon;
do $$declare r jsonb;begin
 r:=public.pasha_reviews_public();
 if (r->>'count')::int<>1 or (r->>'average')::numeric<>1 then raise exception 'Low star review excluded';end if;
 if (r->'reviews'->0) ? 'order_id' or (r->'reviews'->0) ? 'moderated_by' then raise exception 'Private data exposed';end if;
end$$;
reset role;
select public.pasha_reviews_invite('PB-TEST-3') as token3 \gset
update private.pasha_review_invites set expires_at=now()-interval '1 day' where token=:'token3';
select set_config('test.token',:'token3',false);
do $$begin
 begin perform public.pasha_reviews_submit(current_setting('test.token')::uuid,'Sara',5,''); raise exception 'TEST: expired token'; exception when others then if sqlerrm like 'TEST:%' then raise; end if;end;
 begin perform public.pasha_reviews_settings(true,'https://evil.example/'); raise exception 'TEST: unsafe URL'; exception when check_violation then null;end;
end$$;
select public.pasha_reviews_invite('PB-TEST-3') as token3 \gset
update public.orders set status='cancelled' where order_number='PB-TEST-3';
select set_config('test.token',:'token3',false);
do $$begin
 begin perform public.pasha_reviews_submit(current_setting('test.token')::uuid,'Sara',4,''); raise exception 'TEST: cancelled order';exception when others then if sqlerrm like 'TEST:%' then raise;end if;end;
end$$;
select public.pasha_reviews_settings(false,'');
set role anon;
do $$begin if (public.pasha_reviews_public()->>'count')::int<>0 then raise exception 'Kill switch failed';end if;end$$;
reset role;
delete from public.orders where order_number='PB-TEST-1';
do $$begin
 if (select count(*) from public.pasha_reviews)<>1 then raise exception 'Lost historical review';end if;
 if (select count(*) from private.pasha_review_audit)<>1 then raise exception 'Missing moderation audit';end if;
end$$;
select 'Review security and lifecycle checks passed' as result;
