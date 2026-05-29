import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function initIndexes() {
  console.log("🔧 Initializing PostgreSQL extensions and indexes...\n");

  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
  console.log("✅ pg_trgm extension enabled");

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS college_name_trgm_idx ON "College" USING gin (name gin_trgm_ops);`
  );
  console.log("✅ Trigram index on College.name created");

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS college_state_idx ON "College" (state);`
  );
  console.log("✅ B-tree index on College.state created");

  console.log("\n🎉 All indexes initialized successfully");
}

initIndexes()
  .catch((e) => { console.error("❌ Index init error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
