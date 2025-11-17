CREATE TABLE IF NOT EXISTS vn_admin_unit_mappings (
  id SERIAL PRIMARY KEY,
  old_province_code VARCHAR(20) NOT NULL,
  old_district_code VARCHAR(20),
  old_ward_code VARCHAR(20),
  new_province_code VARCHAR(20) NOT NULL,
  new_commune_code VARCHAR(20),
  note TEXT,
  resolution_ref VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vn_admin_mapping_old_codes
  ON vn_admin_unit_mappings (old_province_code, old_district_code, old_ward_code);

CREATE INDEX IF NOT EXISTS idx_vn_admin_mapping_new_codes
  ON vn_admin_unit_mappings (new_province_code, new_commune_code);
