-- ============================================================================
-- Migration: 20260913_02_vanshawali_backfill.sql
-- Description: Idempotent data backfill from app_settings ('vanshawali_store')
--              to relational tables with automatic parity verification & rollback.
--
-- Safety Invariants:
--   1. Non-destructive: app_settings is STRICTLY READ-ONLY. Never modified.
--   2. Idempotent: Safe to re-run via ON CONFLICT (legacy_id) DO UPDATE.
--   3. Parity Gate: Transaction rolls back if persons ≠ 48 or links ≠ 49.
-- ============================================================================

DO $$
DECLARE
    v_setting_val JSONB;
    v_src_persons INT := 0;
    v_src_links INT := 0;
    v_dst_persons INT := 0;
    v_dst_links INT := 0;
BEGIN
    -- Step 1: Read source data WITHOUT modifying app_settings
    SELECT setting_value INTO v_setting_val 
    FROM public.app_settings 
    WHERE setting_key = 'vanshawali_store';

    IF v_setting_val IS NULL THEN
        RAISE EXCEPTION 'Backfill aborted: setting_key = vanshawali_store not found in app_settings!';
    END IF;

    v_src_persons := jsonb_array_length(v_setting_val->'persons');
    v_src_links   := jsonb_array_length(v_setting_val->'links');

    RAISE NOTICE 'Starting Vanshawali backfill: % source persons, % source links.', 
        v_src_persons, v_src_links;

    -- Step 2: Backfill Persons (Nodes)
    INSERT INTO public.vanshawali_persons (
        legacy_id,
        user_id,
        display_name,
        gender,
        birth_year,
        birth_date,
        gotra,
        photo_url,
        created_by,
        created_at,
        updated_at
    )
    SELECT
        p->>'id' AS legacy_id,
        NULLIF(p->>'user_id', '')::UUID AS user_id,
        COALESCE(NULLIF(trim(p->>'display_name'), ''), 'Member') AS display_name,
        NULLIF(lower(trim(p->>'gender')), '') AS gender,
        CASE 
            WHEN (p->>'birth_year') ~ '^\d{4}$' THEN (p->>'birth_year')::INT 
            ELSE NULL 
        END AS birth_year,
        CASE 
            WHEN (p->>'birth_date') ~ '^\d{4}-\d{2}-\d{2}' THEN (p->>'birth_date')::DATE 
            ELSE NULL 
        END AS birth_date,
        NULLIF(trim(p->>'gotra'), '') AS gotra,
        NULLIF(trim(p->>'photo_url'), '') AS photo_url,
        NULLIF(p->>'created_by', '')::UUID AS created_by,
        COALESCE(NULLIF(p->>'created_at', '')::TIMESTAMPTZ, now()) AS created_at,
        now() AS updated_at
    FROM jsonb_array_elements(v_setting_val->'persons') AS p
    ON CONFLICT (legacy_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        user_id      = EXCLUDED.user_id,
        gender       = EXCLUDED.gender,
        birth_year   = EXCLUDED.birth_year,
        birth_date   = EXCLUDED.birth_date,
        gotra        = EXCLUDED.gotra,
        photo_url    = EXCLUDED.photo_url,
        updated_at   = now();

    -- Step 3: Backfill Relationships (Edges)
    INSERT INTO public.vanshawali_relationships (
        legacy_id,
        from_person_id,
        to_person_id,
        relation,
        status,
        proposed_by,
        created_at,
        updated_at
    )
    SELECT
        l->>'id' AS legacy_id,
        fp.id AS from_person_id,
        tp.id AS to_person_id,
        l->>'relation' AS relation,
        COALESCE(NULLIF(l->>'status', ''), 'pending') AS status,
        NULLIF(l->>'proposed_by', '')::UUID AS proposed_by,
        COALESCE(NULLIF(l->>'created_at', '')::TIMESTAMPTZ, now()) AS created_at,
        now() AS updated_at
    FROM jsonb_array_elements(v_setting_val->'links') AS l
    JOIN public.vanshawali_persons fp ON fp.legacy_id = (l->>'from_id')
    JOIN public.vanshawali_persons tp ON tp.legacy_id = (l->>'to_id')
    ON CONFLICT (legacy_id) DO UPDATE SET
        relation   = EXCLUDED.relation,
        status     = EXCLUDED.status,
        updated_at = now();

    -- Step 4: Parity Gate & Automatic Rollback Enforcement
    SELECT count(*) INTO v_dst_persons FROM public.vanshawali_persons;
    SELECT count(*) INTO v_dst_links   FROM public.vanshawali_relationships;

    IF v_dst_persons <> v_src_persons OR v_dst_links <> v_src_links THEN
        RAISE EXCEPTION 'PARITY CHECK FAILED: Expected % persons / % links, but relational tables contain % persons / % links. Transaction rolled back!',
            v_src_persons, v_src_links, v_dst_persons, v_dst_links;
    END IF;

    IF v_dst_persons <> 48 OR v_dst_links <> 49 THEN
        RAISE EXCEPTION 'PRODUCTION INVARIANT FAILED: Expected exactly 48 persons and 49 links. Found % persons, % links. Transaction rolled back!',
            v_dst_persons, v_dst_links;
    END IF;

    RAISE NOTICE 'SUCCESS: Vanshawali 100%% Parity Verified (48 persons, 49 links). Source app_settings untouched.';
END $$;
