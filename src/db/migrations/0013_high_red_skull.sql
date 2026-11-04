CREATE TABLE "bank_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"provider" varchar(32) DEFAULT 'fio' NOT NULL,
	"label" varchar(120),
	"account_number" varchar(64),
	"token_encrypted" text NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"external_id" varchar(64) NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'CZK' NOT NULL,
	"variable_symbol" varchar(16),
	"message" text,
	"counterparty_account" varchar(64),
	"booked_at" timestamp with time zone NOT NULL,
	"direction" varchar(8) NOT NULL,
	"booking_id" uuid,
	"matched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_transactions_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_connection_id_bank_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."bank_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_connections_profile_idx" ON "bank_connections" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "bank_transactions_connection_idx" ON "bank_transactions" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "bank_transactions_booking_idx" ON "bank_transactions" USING btree ("booking_id");