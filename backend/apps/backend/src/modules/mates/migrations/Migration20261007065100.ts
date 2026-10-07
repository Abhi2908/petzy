import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261007065100 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "mates_offer" drop constraint if exists "mates_offer_listing_id_unique";`);
    this.addSql(`alter table if exists "mates_offer" drop constraint if exists "mates_offer_listing_id_buyer_customer_id_unique";`);
    this.addSql(`create table if not exists "mates_listing" ("id" text not null, "seller_customer_id" text not null, "title" text not null, "pet_type" text check ("pet_type" in ('dog', 'cat', 'bird', 'fish', 'other')) not null, "breed" text not null, "gender" text check ("gender" in ('male', 'female')) not null, "age_months" integer not null, "color" text null, "vaccinated" boolean not null default false, "dewormed" boolean not null default false, "has_papers" boolean not null default false, "description" text null, "price" integer not null, "price_negotiable" boolean not null default false, "city" text not null, "state" text not null, "pincode" text not null, "image_urls" text[] not null default '{}', "seller_type" text check ("seller_type" in ('individual', 'breeder')) not null default 'individual', "breeder_registration_no" text null, "seller_phone" text not null, "status" text check ("status" in ('pending_review', 'active', 'rejected', 'reserved', 'sold', 'expired', 'removed')) not null default 'pending_review', "rejection_reason" text null, "expires_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mates_listing_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mates_listing_deleted_at" ON "mates_listing" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mates_listing_status_created_at" ON "mates_listing" ("status", "created_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mates_listing_seller_customer_id" ON "mates_listing" ("seller_customer_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "mates_offer" ("id" text not null, "buyer_customer_id" text not null, "buyer_phone" text not null, "amount" integer not null, "status" text check ("status" in ('open', 'countered', 'accepted', 'rejected', 'withdrawn')) not null default 'open', "last_actor" text check ("last_actor" in ('buyer', 'seller')) not null default 'buyer', "listing_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mates_offer_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mates_offer_listing_id" ON "mates_offer" ("listing_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mates_offer_deleted_at" ON "mates_offer" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mates_offer_buyer_customer_id" ON "mates_offer" ("buyer_customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mates_offer_listing_id_buyer_customer_id_unique" ON "mates_offer" ("listing_id", "buyer_customer_id") WHERE status IN ('open', 'countered') AND deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mates_offer_listing_id_unique" ON "mates_offer" ("listing_id") WHERE status = 'accepted' AND deleted_at IS NULL;`);

    this.addSql(`create table if not exists "mates_message" ("id" text not null, "sender" text check ("sender" in ('buyer', 'seller')) not null, "body" text not null, "offer_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mates_message_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mates_message_offer_id" ON "mates_message" ("offer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mates_message_deleted_at" ON "mates_message" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "mates_report" ("id" text not null, "reporter_customer_id" text not null, "reason" text not null, "status" text check ("status" in ('open', 'resolved')) not null default 'open', "listing_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mates_report_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mates_report_listing_id" ON "mates_report" ("listing_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mates_report_deleted_at" ON "mates_report" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mates_report_status" ON "mates_report" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "mates_offer" add constraint "mates_offer_listing_id_foreign" foreign key ("listing_id") references "mates_listing" ("id") on update cascade;`);

    this.addSql(`alter table if exists "mates_message" add constraint "mates_message_offer_id_foreign" foreign key ("offer_id") references "mates_offer" ("id") on update cascade;`);

    this.addSql(`alter table if exists "mates_report" add constraint "mates_report_listing_id_foreign" foreign key ("listing_id") references "mates_listing" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "mates_offer" drop constraint if exists "mates_offer_listing_id_foreign";`);

    this.addSql(`alter table if exists "mates_report" drop constraint if exists "mates_report_listing_id_foreign";`);

    this.addSql(`alter table if exists "mates_message" drop constraint if exists "mates_message_offer_id_foreign";`);

    this.addSql(`drop table if exists "mates_listing" cascade;`);

    this.addSql(`drop table if exists "mates_offer" cascade;`);

    this.addSql(`drop table if exists "mates_message" cascade;`);

    this.addSql(`drop table if exists "mates_report" cascade;`);
  }

}
