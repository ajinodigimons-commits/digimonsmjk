
-- Allow public/anon SELECT on equipments for public recap
CREATE POLICY "Public can read equipments"
ON public.equipments
FOR SELECT
USING (true);

-- Allow public/anon SELECT on checklist_results for public recap
CREATE POLICY "Public can read checklist_results"
ON public.checklist_results
FOR SELECT
USING (true);

-- Allow public/anon SELECT on checklist_items (already authenticated-only, add anon)
CREATE POLICY "Anon can read checklist items"
ON public.checklist_items
FOR SELECT
USING (true);

-- Allow public/anon SELECT on schedules for public recap
CREATE POLICY "Public can read schedules"
ON public.schedules
FOR SELECT
USING (true);
