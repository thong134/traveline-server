import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, isAbsolute } from 'path';
import { DataSource } from 'typeorm';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

async function main(): Promise<void> {
  const target = process.argv[2];
  if (!target) {
    throw new Error(
      'Usage: npx ts-node scripts/run-sql-migration.ts <migration-file.sql>',
    );
  }

  const filePath = isAbsolute(target)
    ? target
    : join(__dirname, 'migrations', target);

  const sql = readFileSync(filePath, 'utf8');
  if (!sql.trim()) {
    console.log(`No SQL statements found in ${filePath}`);
    return;
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: requireEnv('DATABASE_URL'),
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await dataSource.initialize();
  try {
    await dataSource.query(sql);
    console.log(`Migration ${filePath} executed successfully.`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Migration execution failed:', error);
  process.exit(1);
});
