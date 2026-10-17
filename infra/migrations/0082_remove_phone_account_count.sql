-- 0082: Remove misleading workspace-wide receiving-account count from each phone.
-- Physical SMS forwarders have no phone-to-account or SIM assignment.
-- Preserve receipt_count, pairing, forwarding, verification and plan enforcement.
-- Financial realms (live and sandbox) only. Never rewrite migration 0071.
BEGIN;
DO $migration$
DECLARE
  definition text;
  corrected text;
  old_fragment text :=
    '''account_count'',(SELECT count(*) FROM financial_receiving_accounts a LEFT JOIN pg06_account_configuration c ON c.account_id=a.id WHERE a.workspace_id=w AND a.environment=e AND c.disabled_at IS NULL),';
BEGIN
  IF to_regclass('public.financial_realm') IS NULL
     OR to_regclass('public.auth_sessions') IS NOT NULL
     OR to_regprocedure('public.pg06_phone_list(uuid,text)') IS NULL THEN
    RAISE EXCEPTION '0082 requires an existing isolated financial realm and pg06_phone_list';
  END IF;

  definition := pg_get_functiondef('public.pg06_phone_list(uuid,text)'::regprocedure);

  -- Already removed: idempotent for repeat runs, but reject unknown implementations.
  IF position('''account_count''' IN definition) = 0 THEN
    IF position('''receipt_count''' IN definition) = 0 THEN
      RAISE EXCEPTION '0082 unknown pg06_phone_list definition: receipt_count missing';
    END IF;
    RETURN;
  END IF;

  -- Replace only the exact fragment inserted by migration 0071; fail closed
  -- rather than modifying an unrelated or concurrently evolved function.
  IF position(old_fragment IN definition) = 0 THEN
    RAISE EXCEPTION '0082 unknown pg06_phone_list account_count implementation';
  END IF;

  corrected := replace(definition, old_fragment, '');
  IF position('''account_count''' IN corrected) <> 0
     OR position('''receipt_count''' IN corrected) = 0 THEN
    RAISE EXCEPTION '0082 would alter unexpected phone-list fields';
  END IF;

  EXECUTE corrected;
END
$migration$;
COMMIT;
