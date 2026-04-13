-- Add tanggal_kedaluwarsa field for APAR (which has has_expiry = true)
INSERT INTO equipment_fields (category, field_name, field_label, field_type, is_required, sort_order)
VALUES ('APAR', 'tanggal_kedaluwarsa', 'Tanggal Kedaluwarsa', 'date', false, 5)
ON CONFLICT DO NOTHING;

-- Create dynamic field values table for fields that don't map to fixed columns
CREATE TABLE IF NOT EXISTS equipment_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipments(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_value text,
  UNIQUE(equipment_id, field_name)
);

ALTER TABLE equipment_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own equipment field values"
  ON equipment_field_values FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM equipments e WHERE e.id = equipment_id AND (e.user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')))
  );

CREATE POLICY "Users can insert own equipment field values"
  ON equipment_field_values FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM equipments e WHERE e.id = equipment_id AND (e.user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')))
  );

CREATE POLICY "Users can update own equipment field values"
  ON equipment_field_values FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM equipments e WHERE e.id = equipment_id AND (e.user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')))
  );

CREATE POLICY "Users can delete own equipment field values"
  ON equipment_field_values FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM equipments e WHERE e.id = equipment_id AND (e.user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')))
  );