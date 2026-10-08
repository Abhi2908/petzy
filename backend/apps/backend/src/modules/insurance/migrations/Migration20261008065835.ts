import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261008065835 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "insurance_partner" ("id" text not null, "name" text not null, "logo_url" text null, "website_url" text null, "contact_email" text null, "contact_phone" text null, "notes" text null, "status" text check ("status" in ('active', 'inactive')) not null default 'active', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "insurance_partner_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_insurance_partner_deleted_at" ON "insurance_partner" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "insurance_plan" ("id" text not null, "name" text not null, "description" text null, "pet_types" text[] not null, "min_age_months" integer not null, "max_age_months" integer not null, "annual_premium_from" integer not null, "cover_amount" integer not null, "highlights" text[] not null default '{}', "exclusions" text[] not null default '{}', "status" text check ("status" in ('active', 'inactive')) not null default 'active', "sort_order" integer not null default 0, "partner_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "insurance_plan_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_insurance_plan_partner_id" ON "insurance_plan" ("partner_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_insurance_plan_deleted_at" ON "insurance_plan" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_insurance_plan_status_sort_order" ON "insurance_plan" ("status", "sort_order") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "insurance_lead" ("id" text not null, "customer_name" text not null, "phone" text not null, "phone_key" text not null, "email" text null, "pet_name" text null, "pet_type" text not null, "breed" text null, "pet_age_months" integer not null, "city" text null, "pincode" text null, "message" text null, "status" text check ("status" in ('new', 'contacted', 'sent_to_partner', 'converted', 'closed')) not null default 'new', "internal_notes" text null, "plan_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "insurance_lead_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_insurance_lead_plan_id" ON "insurance_lead" ("plan_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_insurance_lead_deleted_at" ON "insurance_lead" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_insurance_lead_phone_key_created_at" ON "insurance_lead" ("phone_key", "created_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_insurance_lead_status_created_at" ON "insurance_lead" ("status", "created_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "insurance_plan" add constraint "insurance_plan_partner_id_foreign" foreign key ("partner_id") references "insurance_partner" ("id") on update cascade;`);

    this.addSql(`alter table if exists "insurance_lead" add constraint "insurance_lead_plan_id_foreign" foreign key ("plan_id") references "insurance_plan" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "insurance_plan" drop constraint if exists "insurance_plan_partner_id_foreign";`);

    this.addSql(`alter table if exists "insurance_lead" drop constraint if exists "insurance_lead_plan_id_foreign";`);

    this.addSql(`drop table if exists "insurance_partner" cascade;`);

    this.addSql(`drop table if exists "insurance_plan" cascade;`);

    this.addSql(`drop table if exists "insurance_lead" cascade;`);
  }

}
