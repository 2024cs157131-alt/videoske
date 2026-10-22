// Runs on every deploy (after `prisma db push`): turns on Row Level Security for every table,
// so Supabase's public REST API (anon key) can't read or change them. The website itself is not affected.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
await prisma.$executeRawUnsafe(`
  DO $$
  DECLARE t record;
  BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;
  END $$;
`);
console.log('Row Level Security enabled on all tables');
await prisma.$disconnect();
