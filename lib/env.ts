export const env = {
  DATABASE_URL: process.env.DATABASE_URL || "",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || "",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  SUPABASE_STORAGE_BUCKET:
    process.env.SUPABASE_STORAGE_BUCKET || "event-photos",
};
