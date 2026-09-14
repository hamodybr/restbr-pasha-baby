
\set ON_ERROR_STOP on
set test.manager='yes';
select public.pasha_reviews_settings(true,'');
insert into public.orders(order_number,status,client_token) values('CHECKOUT-1','new',gen_random_uuid()),('CHECKOUT-2','new',gen_random_uuid()),('CHECKOUT-3','cancelled',gen_random_uuid()),('CHECKOUT-4','new',gen_random_uuid());
select id as oid,client_token as token from public.orders where order_number='CHECKOUT-1' \gset
set role anon;
select public.pasha_checkout_review(:'oid',:'token',1,'   ');
reset role;
do $$begin
 if not exists(select 1 from public.pasha_reviews r join public.orders o on o.id=r.order_id where o.order_number='CHECKOUT-1' and r.status='approved' and r.verification_kind='order' and r.comment='' and r.first_name='Sara') then raise exception 'Star-only publication failed';end if;
end;$$;
select public.pasha_checkout_review(:'oid',:'token',5,'cannot overwrite');
select id as oid,client_token as token from public.orders where order_number='CHECKOUT-2' \gset
set role anon;
select public.pasha_checkout_review(:'oid',:'token',5,'Comment requires approval');
reset role;
do $$declare before_count int;begin
 if not exists(select 1 from public.pasha_reviews r join public.orders o on o.id=r.order_id where o.order_number='CHECKOUT-2' and r.status='pending') then raise exception 'Comment published without approval';end if;
 if not exists(select 1 from public.pasha_reviews r join public.orders o on o.id=r.order_id where o.order_number='CHECKOUT-1' and r.rating=1) then raise exception 'Retry rewrote rating';end if;
 begin perform public.pasha_checkout_review((select id from public.orders where order_number='CHECKOUT-4'),gen_random_uuid(),5,'');raise exception 'TEST: forged token';exception when others then if sqlerrm like 'TEST:%' then raise;end if;end;
 begin perform public.pasha_checkout_review((select id from public.orders where order_number='CHECKOUT-3'),(select client_token from public.orders where order_number='CHECKOUT-3'),5,'');raise exception 'TEST: cancelled order';exception when others then if sqlerrm like 'TEST:%' then raise;end if;end;
 if (public.pasha_reviews_dashboard_summary()->>'pending')::int<>1 then raise exception 'Pending summary incorrect';end if;
end;$$;
update public.orders set created_at=now()-interval '2 days' where order_number='CHECKOUT-4';
do $$begin
 begin perform public.pasha_checkout_review((select id from public.orders where order_number='CHECKOUT-4'),(select client_token from public.orders where order_number='CHECKOUT-4'),5,'');raise exception 'TEST: expired order';exception when others then if sqlerrm like 'TEST:%' then raise;end if;end;
end;$$;
select 'Checkout ownership, auto-publication, moderation, retries, expiry and summary passed' as result;
