-- ----------------------------------------------------------------------------
-- 20260707001100_confirm_split_payment.sql
-- Links a broadcast SPLIT_BILL payment to the payer's split leg.
--
-- Mirrors confirm_party_payment (000900): pay_split_leg returns a payment
-- template, the confirm sheet records the transfer in public.transactions
-- (PENDING -> BROADCAST with hash, migration 000800), and this RPC verifies
-- that ledger row server-side and flips the caller's leg REQUESTED -> PAID
-- with the receipt linked. It is security definer (the function owner passes
-- public.is_service_role()), so the split_members guard's "PAID via server"
-- rule is preserved: clients still cannot flip PAID directly. The
-- split_members_settle trigger then flips the split to SETTLED when the
-- last leg pays.
--
-- Hardening note: once the submit-tx edge function confirms on-chain SUCCESS,
-- tighten the status filter below from ('BROADCAST', 'SUCCESS') to 'SUCCESS'.
-- ----------------------------------------------------------------------------

create or replace function public.confirm_split_payment(p_split_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_split public.splits%rowtype;
  v_leg public.split_members%rowtype;
  v_tx_id uuid;
  v_split_status text;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED: sign in to confirm a split payment';
  end if;

  select * into v_split from public.splits where id = p_split_id for update;
  if not found then
    raise exception 'NOT_FOUND: split does not exist';
  end if;

  select * into v_leg
  from public.split_members
  where split_id = p_split_id and user_id = v_uid
  for update;
  if not found then
    raise exception 'NOT_FOUND: you have no leg in this split';
  end if;

  -- Idempotent: repeated confirms after success are safe.
  if v_leg.status = 'PAID' then
    return jsonb_build_object(
      'leg_id', v_leg.id,
      'status', v_leg.status,
      'transaction_id', v_leg.transaction_id,
      'split_status', v_split.status
    );
  end if;

  if v_leg.status = 'CANCELLED' or v_split.status = 'CANCELLED' then
    raise exception 'CONFLICT: this split request was cancelled';
  end if;

  -- Verify the caller really broadcast a share payment for this split.
  select t.id into v_tx_id
  from public.transactions t
  where t.type = 'SPLIT_BILL'
    and t.reference_id = p_split_id
    and t.status in ('BROADCAST', 'SUCCESS')
    and t.sender_wallet in (
      select w.id from public.wallets w where w.user_id = v_uid
    )
  order by t.created_at desc
  limit 1;

  if v_tx_id is null then
    raise exception 'NOT_FOUND: no broadcast share payment found for this split';
  end if;

  update public.split_members
  set status = 'PAID',
      transaction_id = v_tx_id,
      paid_at = now()
  where id = v_leg.id
  returning * into v_leg;

  -- Re-read: the settle trigger may have just flipped the split to SETTLED.
  select status into v_split_status from public.splits where id = p_split_id;

  return jsonb_build_object(
    'leg_id', v_leg.id,
    'status', v_leg.status,
    'transaction_id', v_leg.transaction_id,
    'split_status', v_split_status
  );
end;
$$;

revoke all on function public.confirm_split_payment(uuid) from public;
grant execute on function public.confirm_split_payment(uuid) to authenticated;
