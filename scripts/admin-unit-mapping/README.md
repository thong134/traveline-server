# Admin Unit Mapping Pipeline

This script suite turns Vietnamese administrative merger resolutions into SQL `INSERT` statements for the `vn_admin_unit_mappings` table. The workflow:

1. Parse legacy and reform SQL datasets to build in-memory indexes of provinces, districts, and commune level units.
2. Parse a raw Vietnamese resolution text, extracting merger clauses and their source/destination administrative units.
3. Match the textual names against the legacy and reform datasets using accent-insensitive normalization.
4. Produce ready-to-run SQL covering every obsolete unit referenced in the resolution.

## Usage

```bash
pnpm ts-node scripts/admin-unit-mapping/index.ts \
  --legacy ./scripts/migrations/ImportData_vn_units_old.sql \
  --reform ./scripts/migrations/ImportData_vn_units.sql \
  --resolution ./scripts/An_Giang.txt \
  --resolutionRef "Nghị quyết 123/NQ-CP" \
  --output ./output/mapping_an_giang.sql
```

### Key options

- `--legacy` — Path to the *pre-merger* SQL dataset (`ImportData_vn_units_old.sql`).
- `--reform` — Path to the *post-merger* SQL dataset (`ImportData_vn_units.sql`).
- `--resolution` — Text file containing the raw Government resolution in Vietnamese.
- `--resolutionRef` — Short label recorded in the `resolution_ref` column (for traceability).
- `--output` — Destination `.sql` file for generated `INSERT` statements.

The CLI does not modify source datasets. It reads all inputs asynchronously and fails fast if any name cannot be matched uniquely. Normalized name indexes allow the same pipeline to be reused for every province undergoing restructuring.
