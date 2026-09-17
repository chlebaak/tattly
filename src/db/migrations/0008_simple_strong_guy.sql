CREATE TYPE "public"."payment_method" AS ENUM('stripe', 'qr');--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "method" "payment_method";