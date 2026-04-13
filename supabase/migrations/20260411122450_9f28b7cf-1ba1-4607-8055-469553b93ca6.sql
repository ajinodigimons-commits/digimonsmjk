
-- 1. Clear existing base64 signature data and set all to 'approve'
UPDATE public.inspections SET signature = 'approve' WHERE signature IS NOT NULL AND signature != 'approve';

-- 2. Set default value for signature column to 'approve'
ALTER TABLE public.inspections ALTER COLUMN signature SET DEFAULT 'approve';

-- 3. Drop legacy checklist_results table (data already migrated to inspections + inspection_answers)
DROP TABLE IF EXISTS public.checklist_results;
