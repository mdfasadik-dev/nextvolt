-- RLS policies for the categories table.
-- Adjust as needed for ownership-based rules.

-- Enable RLS if not already
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Select for authenticated users
DO $$ BEGIN
  CREATE POLICY categories_select ON public.categories
    FOR SELECT USING ( auth.role() = 'authenticated' );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Insert for authenticated users
DO $$ BEGIN
  CREATE POLICY categories_insert ON public.categories
    FOR INSERT WITH CHECK ( auth.role() = 'authenticated' );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Update for authenticated users
DO $$ BEGIN
  CREATE POLICY categories_update ON public.categories
    FOR UPDATE USING ( auth.role() = 'authenticated' )
    WITH CHECK ( auth.role() = 'authenticated' );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Delete for authenticated users
DO $$ BEGIN
  CREATE POLICY categories_delete ON public.categories
    FOR DELETE USING ( auth.role() = 'authenticated' );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
