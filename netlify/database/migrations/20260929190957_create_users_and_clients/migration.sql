CREATE TABLE "app_users" (
	"id" serial PRIMARY KEY,
	"identity_id" text NOT NULL UNIQUE,
	"email" text NOT NULL UNIQUE,
	"name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY,
	"data" jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
