
\set ON_ERROR_STOP on
set role anon;
do $$declare r jsonb;total bigint;begin
 r:=public.pasha_reviews_public();
 select sum(value::bigint) into total from jsonb_each_text(r->'distribution');
 if total<>(r->>'count')::bigint then raise exception 'Distribution count mismatch';end if;
 if (r->'distribution'->>'1')::int<>2 or (r->'distribution'->>'5')::int<>0 then raise exception 'Pending leaked or approved missing';end if;
 if (r->>'comment_count')::int<>1 then raise exception 'Comment count mismatch';end if;
end;$$;
reset role;
begin;
update public.pasha_review_settings set enabled=false;
set local role anon;
do $$begin
 if (public.pasha_reviews_public()->>'count')::int<>0 or public.pasha_reviews_public()->'distribution'<>'{"1":0,"2":0,"3":0,"4":0,"5":0}'::jsonb then raise exception 'Disabled statistics exposed';end if;
end;$$;
rollback;
select 'Approved-only rating distribution passed' as result;
