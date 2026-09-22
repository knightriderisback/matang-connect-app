-- ============================================================================
-- Migration: 20260913_01_vanshawali_schema.sql
-- Description: Normalized relational schema, constraints, indexes, RLS, and
--              graph traversal RPC for the community-wide Vanshawali graph.
--
-- Invariants:
--   1. Community-wide connected graph (NO mandatory family_tree_id / silos).
--   2. Preserves legacy v_... string IDs for 100% backward compatibility.
--   3. Sub-millisecond indexed lookups for forward/reverse/pair traversal.
--   4. RLS enabled with authenticated community read access.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. NODES TABLE: public.vanshawali_persons
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vanshawali_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    gender TEXT CHECK (gender IS NULL OR gender IN ('male', 'female', 'other')),
    birth_year INT CHECK (birth_year IS NULL OR (birth_year >= 1800 AND birth_year <= 2100)),
    birth_date DATE,
    gotra TEXT,
    photo_url TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_vanshawali_persons_name_not_empty 
        CHECK (length(trim(display_name)) > 0)
);

-- At most one personal node per registered Matang Connect member
CREATE UNIQUE INDEX IF NOT EXISTS idx_vanshawali_persons_user_id 
    ON public.vanshawali_persons(user_id) 
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vanshawali_persons_legacy_id 
    ON public.vanshawali_persons(legacy_id);

CREATE INDEX IF NOT EXISTS idx_vanshawali_persons_created_by 
    ON public.vanshawali_persons(created_by);

CREATE INDEX IF NOT EXISTS idx_vanshawali_persons_name 
    ON public.vanshawali_persons(display_name);


-- ----------------------------------------------------------------------------
-- 2. EDGES TABLE: public.vanshawali_relationships
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vanshawali_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    from_person_id UUID NOT NULL REFERENCES public.vanshawali_persons(id) ON DELETE CASCADE,
    to_person_id UUID NOT NULL REFERENCES public.vanshawali_persons(id) ON DELETE CASCADE,
    relation TEXT NOT NULL CHECK (relation IN ('child', 'spouse', 'father', 'mother')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    proposed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT chk_vanshawali_no_self_link CHECK (from_person_id <> to_person_id),
    CONSTRAINT uq_vanshawali_logical_edge UNIQUE (from_person_id, to_person_id, relation)
);

-- Traversal and foreign key indexes
CREATE INDEX IF NOT EXISTS idx_vanshawali_rel_from 
    ON public.vanshawali_relationships(from_person_id);

CREATE INDEX IF NOT EXISTS idx_vanshawali_rel_to 
    ON public.vanshawali_relationships(to_person_id);

CREATE INDEX IF NOT EXISTS idx_vanshawali_rel_pair 
    ON public.vanshawali_relationships(from_person_id, to_person_id);

CREATE INDEX IF NOT EXISTS idx_vanshawali_rel_status 
    ON public.vanshawali_relationships(status);

CREATE INDEX IF NOT EXISTS idx_vanshawali_rel_proposed_by 
    ON public.vanshawali_relationships(proposed_by);

CREATE INDEX IF NOT EXISTS idx_vanshawali_rel_legacy_id 
    ON public.vanshawali_relationships(legacy_id);

-- Flexible parent cardinality: allow multiple verified parents (e.g. adoptive/step/composite lineages)
-- Logical uniqueness (from_person_id, to_person_id, relation) remains strictly enforced above.
DROP INDEX IF EXISTS public.uq_vanshawali_single_father;
DROP INDEX IF EXISTS public.uq_vanshawali_single_mother;


-- ----------------------------------------------------------------------------
-- 3. ROW-LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.vanshawali_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vanshawali_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vanshawali_persons_select" ON public.vanshawali_persons;
DROP POLICY IF EXISTS "vanshawali_persons_insert" ON public.vanshawali_persons;
DROP POLICY IF EXISTS "vanshawali_persons_update" ON public.vanshawali_persons;
DROP POLICY IF EXISTS "vanshawali_persons_delete" ON public.vanshawali_persons;

DROP POLICY IF EXISTS "vanshawali_relationships_select" ON public.vanshawali_relationships;
DROP POLICY IF EXISTS "vanshawali_relationships_insert" ON public.vanshawali_relationships;
DROP POLICY IF EXISTS "vanshawali_relationships_update" ON public.vanshawali_relationships;
DROP POLICY IF EXISTS "vanshawali_relationships_delete" ON public.vanshawali_relationships;

CREATE POLICY "vanshawali_persons_select" 
    ON public.vanshawali_persons FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "vanshawali_persons_insert" 
    ON public.vanshawali_persons FOR INSERT 
    TO authenticated 
    WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "vanshawali_persons_update" 
    ON public.vanshawali_persons FOR UPDATE 
    TO authenticated 
    USING (
        created_by = auth.uid() 
        OR user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );

CREATE POLICY "vanshawali_persons_delete" 
    ON public.vanshawali_persons FOR DELETE 
    TO authenticated 
    USING (
        created_by = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );

CREATE POLICY "vanshawali_relationships_select" 
    ON public.vanshawali_relationships FOR SELECT 
    TO authenticated 
    USING (
        status = 'verified' 
        OR proposed_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
              AND u.role IN ('volunteer', 'core_committee', 'super_admin')
        )
    );

CREATE POLICY "vanshawali_relationships_insert" 
    ON public.vanshawali_relationships FOR INSERT 
    TO authenticated 
    WITH CHECK (proposed_by = auth.uid() OR proposed_by IS NULL);

CREATE POLICY "vanshawali_relationships_update" 
    ON public.vanshawali_relationships FOR UPDATE 
    TO authenticated 
    USING (
        proposed_by = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
              AND u.role IN ('core_committee', 'super_admin')
        )
    );

CREATE POLICY "vanshawali_relationships_delete" 
    ON public.vanshawali_relationships FOR DELETE 
    TO authenticated 
    USING (
        proposed_by = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );


-- ----------------------------------------------------------------------------
-- 4. RECURSIVE SUBGRAPH TRAVERSAL FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_vanshawali_subgraph(
    p_center_person_id UUID,
    p_viewer_id UUID,
    p_is_staff BOOLEAN,
    p_max_depth INT DEFAULT 12
)
RETURNS TABLE (
    node_id UUID,
    legacy_id TEXT,
    user_id UUID,
    display_name TEXT,
    gender TEXT,
    birth_year INT,
    birth_date DATE,
    photo_url TEXT,
    gotra TEXT,
    relation_type TEXT,
    relative_depth INT,
    via_person_id UUID,
    edge_id UUID,
    edge_legacy_id TEXT,
    edge_status TEXT
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
WITH RECURSIVE
visible_edges AS (
    SELECT 
        id,
        legacy_id,
        from_person_id, 
        to_person_id, 
        relation,
        status
    FROM public.vanshawali_relationships
    WHERE status = 'verified' 
       OR proposed_by = p_viewer_id 
       OR p_is_staff = true
),
ancestors AS (
    SELECT 
        e.from_person_id AS person_id,
        e.relation AS rel_type,
        1 AS depth,
        p_center_person_id AS via_id,
        ARRAY[p_center_person_id, e.from_person_id] AS path,
        e.id AS edge_id,
        e.legacy_id AS edge_legacy_id,
        e.status AS edge_status
    FROM visible_edges e
    WHERE e.to_person_id = p_center_person_id
      AND e.relation IN ('child', 'father', 'mother')
    
    UNION ALL
    
    SELECT 
        e.from_person_id AS person_id,
        e.relation AS rel_type,
        a.depth + 1 AS depth,
        a.person_id AS via_id,
        a.path || e.from_person_id AS path,
        e.id AS edge_id,
        e.legacy_id AS edge_legacy_id,
        e.status AS edge_status
    FROM visible_edges e
    JOIN ancestors a ON e.to_person_id = a.person_id
    WHERE a.depth < p_max_depth
      AND e.relation IN ('child', 'father', 'mother')
      AND NOT (e.from_person_id = ANY(a.path)) -- CYCLE PROTECTION
),
descendants AS (
    SELECT 
        e.to_person_id AS person_id,
        'child'::TEXT AS rel_type,
        1 AS depth,
        p_center_person_id AS via_id,
        ARRAY[p_center_person_id, e.to_person_id] AS path,
        e.id AS edge_id,
        e.legacy_id AS edge_legacy_id,
        e.status AS edge_status
    FROM visible_edges e
    WHERE e.from_person_id = p_center_person_id
      AND e.relation IN ('child', 'father', 'mother')
    
    UNION ALL
    
    SELECT 
        e.to_person_id AS person_id,
        'child'::TEXT AS rel_type,
        d.depth + 1 AS depth,
        d.person_id AS via_id,
        d.path || e.to_person_id AS path,
        e.id AS edge_id,
        e.legacy_id AS edge_legacy_id,
        e.status AS edge_status
    FROM visible_edges e
    JOIN descendants d ON e.from_person_id = d.person_id
    WHERE d.depth < p_max_depth
      AND e.relation IN ('child', 'father', 'mother')
      AND NOT (e.to_person_id = ANY(d.path)) -- CYCLE PROTECTION
),
spouses AS (
    SELECT 
        CASE WHEN e.from_person_id = p_center_person_id THEN e.to_person_id ELSE e.from_person_id END AS person_id,
        'spouse'::TEXT AS rel_type,
        0 AS depth,
        p_center_person_id AS via_id,
        ARRAY[p_center_person_id] AS path,
        e.id AS edge_id,
        e.legacy_id AS edge_legacy_id,
        e.status AS edge_status
    FROM visible_edges e
    WHERE e.relation = 'spouse' 
       AND (e.from_person_id = p_center_person_id OR e.to_person_id = p_center_person_id)
),
combined_nodes AS (
    SELECT 
        p_center_person_id AS person_id, 
        'self'::TEXT AS rel_type, 
        0 AS depth, 
        NULL::UUID AS via_id,
        NULL::UUID AS edge_id,
        NULL::TEXT AS edge_legacy_id,
        'verified'::TEXT AS edge_status
    UNION ALL
    SELECT person_id, rel_type, depth, via_id, edge_id, edge_legacy_id, edge_status FROM ancestors
    UNION ALL
    SELECT person_id, rel_type, -depth AS depth, via_id, edge_id, edge_legacy_id, edge_status FROM descendants
    UNION ALL
    SELECT person_id, rel_type, depth, via_id, edge_id, edge_legacy_id, edge_status FROM spouses
)
SELECT DISTINCT ON (p.id)
    p.id AS node_id,
    p.legacy_id,
    p.user_id,
    p.display_name,
    p.gender,
    p.birth_year,
    p.birth_date,
    p.photo_url,
    p.gotra,
    c.rel_type AS relation_type,
    c.depth AS relative_depth,
    c.via_id AS via_person_id,
    c.edge_id,
    c.edge_legacy_id,
    c.edge_status
FROM combined_nodes c
JOIN public.vanshawali_persons p ON p.id = c.person_id
ORDER BY p.id, abs(c.depth) ASC;
$$;
