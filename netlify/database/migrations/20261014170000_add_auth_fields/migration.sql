ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "password_hash" text;
--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "salt" text;
--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'accountant';
--> statement-breakpoint
ALTER TABLE "app_users" ALTER COLUMN "status" SET DEFAULT 'approved';
