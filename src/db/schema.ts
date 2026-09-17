import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending_review",
  "deposit_pending",
  "confirmed",
  "rejected",
  "completed",
  "cancelled",
  "expired",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "refunded",
  "failed",
]);

export const paymentMethodEnum = pgEnum("payment_method", ["stripe", "qr"]);

export type WeeklySchedule = Record<string, { from: string; to: string }[]>;

export type DayException = {
  closed: boolean;
  windows?: { from: string; to: string }[];
};

export type BookingRules = {
  weeklySchedule?: WeeklySchedule;
  exceptions?: Record<string, DayException>;
  minLeadTimeHours?: number;
  maxBookingsPerDay?: number;
  slotIntervalMinutes?: number;
};

export type CustomFormField = {
  id: string;
  label: string;
  type: "text" | "number" | "textarea" | "select";
  required?: boolean;
  options?: string[];
};

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  website: varchar("website", { length: 255 }),
  instagram: varchar("instagram", { length: 255 }),
  tiktok: varchar("tiktok", { length: 255 }),
  facebook: varchar("facebook", { length: 255 }),
  studioName: varchar("studio_name", { length: 120 }),
  styles: varchar("styles", { length: 255 }),
  addressLine: varchar("address_line", { length: 255 }),
  city: varchar("city", { length: 120 }),
  zip: varchar("zip", { length: 12 }),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  currency: varchar("currency", { length: 3 }).notNull().default("CZK"),
  timezone: varchar("timezone", { length: 64 })
    .notNull()
    .default("Europe/Prague"),
  defaultDepositAmount: integer("default_deposit_amount")
    .notNull()
    .default(150000),
  stripeAccountId: varchar("stripe_account_id", { length: 255 }),
  ico: varchar("ico", { length: 16 }),
  dic: varchar("dic", { length: 16 }),
  bankAccount: varchar("bank_account", { length: 64 }),
  invoiceCounter: integer("invoice_counter").notNull().default(1),
  googleRefreshToken: text("google_refresh_token"),
  googleCalendarId: varchar("google_calendar_id", { length: 255 }),
  bookingRules: jsonb("booking_rules")
    .$type<BookingRules>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    slotIntervalMinutes: integer("slot_interval_minutes"),
    priceMinor: integer("price_minor"),
    depositMinor: integer("deposit_minor"),
    requiresDeposit: boolean("requires_deposit").notNull().default(true),
    customFormFields: jsonb("custom_form_fields")
      .$type<CustomFormField[]>()
      .notNull()
      .default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("services_profile_idx").on(t.profileId)]
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    status: bookingStatusEnum("status").notNull().default("pending_review"),
    clientName: varchar("client_name", { length: 120 }).notNull(),
    clientEmail: varchar("client_email", { length: 255 }).notNull(),
    clientPhone: varchar("client_phone", { length: 32 }),
    description: text("description"),
    formData: jsonb("form_data")
      .$type<Record<string, string | number | boolean>>()
      .notNull()
      .default({}),
    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),
    depositAmount: integer("deposit_amount"),
    depositExpiresAt: timestamp("deposit_expires_at", { withTimezone: true }),
    priceMinor: integer("price_minor"),
    invoiceNumber: varchar("invoice_number", { length: 32 }),
    invoicedAt: timestamp("invoiced_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    googleEventId: varchar("google_event_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("bookings_profile_status_idx").on(t.profileId, t.status),
    index("bookings_start_idx").on(t.startTime),
  ]
);

export const bookingAssets = pgTable(
  "booking_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    storagePath: varchar("storage_path", { length: 512 }).notNull(),
    fileType: varchar("file_type", { length: 64 }),
    fileSize: integer("file_size"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("booking_assets_booking_idx").on(t.bookingId)]
);

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }).unique(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", {
    length: 255,
  }).unique(),
  method: paymentMethodEnum("method"),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("CZK"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BookingAsset = typeof bookingAssets.$inferSelect;
export type Payment = typeof payments.$inferSelect;
