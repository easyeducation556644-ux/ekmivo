import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing; no database operation performed.");
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require", max: 1, connect_timeout: 10, prepare: false,
});
try {
  const result = await sql.begin(async tx => {
    await tx.unsafe("SET TRANSACTION READ ONLY");
    const tables = await tx.unsafe("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    const migrationHistory = tables.some(row => row.table_name === "schema_migrations");
    return { connection: "ok", tables: tables.map(row => row.table_name), migration_history_present: migrationHistory };
  });
  console.log(JSON.stringify(result, null, 2));
} catch {
  console.error("DATABASE_INSPECTION_FAILED: connection details suppressed.");
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 3 });
}