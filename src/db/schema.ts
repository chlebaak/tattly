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

export const paymentMethodEnum = pgEnum("payment_method", [
  "qr",
  "bank",
]);

export type ClientRequest = {
  kind: "reschedule" | "cancel" | "question";
  message?: string;
  createdAt: string;
};

export type BookingEventType =
  | "created"
  | "approved"
  | "deposit_sent"
  | "deposit_marked_paid"
  | "deposit_paid"
  | "confirmed"
  | "reminder"
  | "rescheduled"
  | "completed"
  | "cancelled"
  | "rejected"
  | "expired"
  | "refund_requested"
  | "refunded"
  | "message"
  | "request"
  | "request_resolved"
  | "assets_purged";

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
  ico: varchar("ico", { length: 16 }),
  dic: varchar("dic", { length: 16 }),
  bankAccount: varchar("bank_account", { length: 64 }),
  invoiceCounter: integer("invoice_counter").notNull().default(1),
  portfolioImages: jsonb("portfolio_images")
    .$type<{ key: string; alt?: string }[]>()
    .notNull()
    .default([]),
  googleRefreshToken: text("google_refresh_token"),
  googleCalendarId: varchar("google_calendar_id", { length: 255 }),
  /**
   * True = Google přístup vypršel/odvolán (invalid_grant). Klientovi dál
   * ukazujeme termíny, ale tatér dostane v aplikaci výzvu k opětovnému
   * připojení, aby se rezervace nepotkávaly s jeho kalendářem.
   */
  googleNeedsReconnect: boolean("google_needs_reconnect").notNull().default(false),
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
    /** Název služby v okamžiku rezervace – historie přežije smazání služby. */
    serviceTitle: varchar("service_title", { length: 120 }),
    status: bookingStatusEnum("status").notNull().default("pending_review"),
    statusCode: varchar("status_code", { length: 16 }).unique(),
    clientName: varchar("client_name", { length: 120 }).notNull(),
    clientEmail: varchar("client_email", { length: 255 }).notNull(),
    clientPhone: varchar("client_phone", { length: 32 }),
    description: text("description"),
    notes: text("notes"),
    formData: jsonb("form_data")
      .$type<Record<string, string | number | boolean>>()
      .notNull()
      .default({}),
    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),
    depositAmount: integer("deposit_amount"),
    depositExpiresAt: timestamp("deposit_expires_at", { withTimezone: true }),
    variableSymbol: varchar("variable_symbol", { length: 10 }),
    clientPaidAt: timestamp("client_paid_at", { withTimezone: true }),
    clientIban: varchar("client_iban", { length: 64 }),
    openRequest: jsonb("open_request").$type<ClientRequest | null>(),
    priceMinor: integer("price_minor"),
    invoiceNumber: varchar("invoice_number", { length: 32 }),
    invoicedAt: timestamp("invoiced_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    googleEventId: varchar("google_event_id", { length: 255 }),
    /**
     * Kdy smazat citlivé přílohy (fotky + odpovědi z dotazníku). `null` =
     * není co uklízet (úklid proběhl) nebo u rezervace bez citlivých dat.
     */
    assetsPurgeAfter: timestamp("assets_purge_after", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("bookings_profile_status_idx").on(t.profileId, t.status),
    index("bookings_profile_created_idx").on(t.profileId, t.createdAt),
    index("bookings_client_email_idx").on(t.clientEmail),
    index("bookings_start_idx").on(t.startTime),
    index("bookings_assets_purge_idx").on(t.assetsPurgeAfter),
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

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    method: paymentMethodEnum("method"),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("CZK"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    refundNote: text("refund_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("payments_booking_idx").on(t.bookingId),
    index("payments_paid_at_idx").on(t.paidAt),
  ]
);

export const bookingEvents = pgTable(
  "booking_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(),
    actor: varchar("actor", { length: 16 }).notNull().default("system"),
    message: text("message"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("booking_events_booking_idx").on(t.bookingId)]
);

export const bankConnections = pgTable(
  "bank_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull().default("fio"),
    label: varchar("label", { length: 120 }),
    accountNumber: varchar("account_number", { length: 64 }),
    tokenEncrypted: text("token_encrypted").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("bank_connections_profile_idx").on(t.profileId)]
);

export const bankTransactions = pgTable(
  "bank_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => bankConnections.id, { onDelete: "cascade" }),
    externalId: varchar("external_id", { length: 64 }).notNull().unique(),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("CZK"),
    variableSymbol: varchar("variable_symbol", { length: 16 }),
    message: text("message"),
    counterpartyAccount: varchar("counterparty_account", { length: 64 }),
    bookedAt: timestamp("booked_at", { withTimezone: true }).notNull(),
    direction: varchar("direction", { length: 8 }).notNull(),
    bookingId: uuid("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    matchedAt: timestamp("matched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("bank_transactions_connection_idx").on(t.connectionId),
    index("bank_transactions_booking_idx").on(t.bookingId),
  ]
);

export type Profile = typeof profiles.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BookingAsset = typeof bookingAssets.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type BookingEvent = typeof bookingEvents.$inferSelect;
export type BankConnection = typeof bankConnections.$inferSelect;
export type BankTransaction = typeof bankTransactions.$inferSelect;
