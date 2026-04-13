
-- 1. Create inspections header table
CREATE TABLE public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  checked_by uuid NOT NULL,
  officer_name text,
  signature text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create inspection_answers detail table
CREATE TABLE public.inspection_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  checklist_item_id uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  answer text NOT NULL DEFAULT '',
  notes text
);

-- 3. Indexes for performance
CREATE INDEX idx_inspections_equipment_id ON public.inspections(equipment_id);
CREATE INDEX idx_inspections_checked_at ON public.inspections(checked_at DESC);
CREATE INDEX idx_inspections_checked_by ON public.inspections(checked_by);
CREATE INDEX idx_inspection_answers_inspection_id ON public.inspection_answers(inspection_id);
CREATE INDEX idx_inspection_answers_checklist_item_id ON public.inspection_answers(checklist_item_id);

-- 4. Enable RLS
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_answers ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for inspections
CREATE POLICY "Users can insert own inspections"
  ON public.inspections FOR INSERT
  WITH CHECK (auth.uid() = checked_by);

CREATE POLICY "Users can read own inspections"
  ON public.inspections FOR SELECT
  USING (auth.uid() = checked_by);

CREATE POLICY "Admins can read all inspections"
  ON public.inspections FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read inspections"
  ON public.inspections FOR SELECT
  USING (true);

-- 6. RLS policies for inspection_answers
CREATE POLICY "Users can insert own inspection answers"
  ON public.inspection_answers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.inspections i
    WHERE i.id = inspection_answers.inspection_id
    AND i.checked_by = auth.uid()
  ));

CREATE POLICY "Users can read own inspection answers"
  ON public.inspection_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.inspections i
    WHERE i.id = inspection_answers.inspection_id
    AND i.checked_by = auth.uid()
  ));

CREATE POLICY "Admins can read all inspection answers"
  ON public.inspection_answers FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read inspection answers"
  ON public.inspection_answers FOR SELECT
  USING (true);

-- 7. Migrate existing data from checklist_results to new tables
-- Group by equipment_id + checked_at (truncated to minute) to create inspection headers
INSERT INTO public.inspections (id, equipment_id, checked_at, checked_by, officer_name, signature, created_at)
SELECT
  gen_random_uuid(),
  equipment_id,
  MIN(checked_at),
  checked_by,
  MAX(officer_name),
  MAX(signature),
  MIN(checked_at)
FROM public.checklist_results
GROUP BY equipment_id, date_trunc('minute', checked_at), checked_by;

-- Insert answers referencing the new inspections
INSERT INTO public.inspection_answers (inspection_id, checklist_item_id, answer, notes)
SELECT
  i.id,
  cr.checklist_item_id,
  cr.answer,
  cr.notes
FROM public.checklist_results cr
JOIN public.inspections i
  ON i.equipment_id = cr.equipment_id
  AND i.checked_by = cr.checked_by
  AND date_trunc('minute', i.checked_at) = date_trunc('minute', cr.checked_at);

-- 8. Enable realtime for inspections
ALTER PUBLICATION supabase_realtime ADD TABLE public.inspections;
