ALTER TABLE "app_users" ALTER COLUMN "status" SET DEFAULT 'pending';
--> statement-breakpoint
DELETE FROM "app_users" WHERE "email" != 'al22020503@itsa.edu.mx';
--> statement-breakpoint
DELETE FROM "app_users" WHERE "email" = 'al22020503@itsa.edu.mx';
--> statement-breakpoint
INSERT INTO "app_users" ("identity_id", "email", "name", "password_hash", "salt", "role", "status", "created_at")
VALUES (
    'admin-master-itsa',
    'al22020503@itsa.edu.mx',
    'Administrador Principal',
    'f8c18e810edd065517f8f72c965a597f2616db785bb2b7e8f82994545c095581484bc3dfbfb6bd610016bdaf694942522e9bee7fb1139ab772fcde05f85ae8da',
    'c8b6a1e9487c2f309a4d812354fe98ab',
    'admin',
    'approved',
    now()
);
