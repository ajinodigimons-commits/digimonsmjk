
-- Table for dynamic equipment field definitions per category
CREATE TABLE public.equipment_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  options jsonb DEFAULT NULL,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_fields ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage equipment_fields"
  ON public.equipment_fields FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- All authenticated can read
CREATE POLICY "Authenticated can read equipment_fields"
  ON public.equipment_fields FOR SELECT
  TO authenticated
  USING (true);

-- Seed default fields for APAR
INSERT INTO public.equipment_fields (category, field_name, field_label, field_type, options, is_required, sort_order) VALUES
  ('APAR', 'lokasi', 'Lokasi', 'text', NULL, true, 1),
  ('APAR', 'status', 'Status', 'dropdown', '["Aktif (Digunakan)", "Non Aktif"]', true, 2),
  ('APAR', 'jenis_apar', 'Jenis APAR', 'dropdown', '["Powder", "CO2", "Foam", "Clean Agent"]', false, 3),
  ('APAR', 'berat_netto', 'Berat Netto (kg)', 'number', NULL, false, 4),
  ('APAR', 'tanggal_kedaluwarsa', 'Tanggal Kedaluwarsa', 'date', NULL, false, 5);

-- Seed default fields for Hydrant
INSERT INTO public.equipment_fields (category, field_name, field_label, field_type, options, is_required, sort_order) VALUES
  ('Hydrant', 'lokasi', 'Lokasi', 'text', NULL, true, 1),
  ('Hydrant', 'status', 'Status', 'dropdown', '["Aktif (Digunakan)", "Non Aktif"]', true, 2);

-- Seed default fields for P3K
INSERT INTO public.equipment_fields (category, field_name, field_label, field_type, options, is_required, sort_order) VALUES
  ('P3K', 'lokasi', 'Lokasi', 'text', NULL, true, 1),
  ('P3K', 'status', 'Status', 'dropdown', '["Aktif (Digunakan)", "Non Aktif"]', true, 2);

-- Seed default fields for Emergency Lamp
INSERT INTO public.equipment_fields (category, field_name, field_label, field_type, options, is_required, sort_order) VALUES
  ('Emergency Lamp', 'lokasi', 'Lokasi', 'text', NULL, true, 1),
  ('Emergency Lamp', 'status', 'Status', 'dropdown', '["Aktif (Digunakan)", "Non Aktif"]', true, 2);
