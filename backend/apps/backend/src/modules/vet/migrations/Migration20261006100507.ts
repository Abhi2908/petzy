import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261006100507 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vet_appointment" drop constraint if exists "vet_appointment_provider_id_starts_at_unique";`);
    this.addSql(`create table if not exists "vet_provider" ("id" text not null, "name" text not null, "clinic_name" text not null, "city" text not null, "phone" text null, "email" text null, "specialties" text null, "consultation_fee" integer not null default 0, "slot_minutes" integer not null default 30, "status" text check ("status" in ('active', 'inactive')) not null default 'active', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vet_provider_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vet_provider_deleted_at" ON "vet_provider" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "vet_appointment" ("id" text not null, "customer_name" text not null, "customer_phone" text not null, "customer_email" text null, "pet_name" text not null, "pet_type" text not null, "reason" text null, "starts_at" timestamptz not null, "ends_at" timestamptz not null, "status" text check ("status" in ('booked', 'confirmed', 'completed', 'cancelled', 'no_show')) not null default 'booked', "notes" text null, "provider_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vet_appointment_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vet_appointment_provider_id" ON "vet_appointment" ("provider_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vet_appointment_deleted_at" ON "vet_appointment" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vet_appointment_provider_id_starts_at_unique" ON "vet_appointment" ("provider_id", "starts_at") WHERE status <> 'cancelled' AND deleted_at IS NULL;`);

    this.addSql(`create table if not exists "vet_working_hour" ("id" text not null, "weekday" integer not null, "start_time" text not null, "end_time" text not null, "provider_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vet_working_hour_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vet_working_hour_provider_id" ON "vet_working_hour" ("provider_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vet_working_hour_deleted_at" ON "vet_working_hour" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "vet_appointment" add constraint "vet_appointment_provider_id_foreign" foreign key ("provider_id") references "vet_provider" ("id") on update cascade;`);

    this.addSql(`alter table if exists "vet_working_hour" add constraint "vet_working_hour_provider_id_foreign" foreign key ("provider_id") references "vet_provider" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vet_appointment" drop constraint if exists "vet_appointment_provider_id_foreign";`);

    this.addSql(`alter table if exists "vet_working_hour" drop constraint if exists "vet_working_hour_provider_id_foreign";`);

    this.addSql(`drop table if exists "vet_provider" cascade;`);

    this.addSql(`drop table if exists "vet_appointment" cascade;`);

    this.addSql(`drop table if exists "vet_working_hour" cascade;`);
  }

}
