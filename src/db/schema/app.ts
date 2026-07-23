import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { roleEnum, userStatusEnum } from "./enums.js";
import { user } from "./auth.js";
export const paymentStatusEnum = pgEnum("payment_status", [
  "Approved",
  "Rejected",
  "Pending",
  "recheck",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "Cash",
  "Bkash",
  "Nagad",
  "Upay",
  "Rocket",
  "Bank",
]);

const timeStamp = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};



export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    extraFine: numeric("extra_fine", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    paymentMonth: integer("payment_month").notNull(),
    paymentYear: integer("payment_year").notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    transactionNo: varchar("transaction_no", { length: 255 }).unique(),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("Pending"),
    note: text("note"),
    paymentDate: timestamp("payment_date", { mode: "date" }).defaultNow().notNull(),
    ...timeStamp,
  },
  (table) => [
    uniqueIndex("user_month_year_idx").on(
      table.userId,
      table.paymentMonth,
      table.paymentYear,
    ),
  ],
);

export const systemSettings = pgTable("system_settings", {
  id: integer("id").primaryKey().default(1),
  defaultMonthlyFee: numeric("default_monthly_fee", {
    precision: 12,
    scale: 2,
  })
    .notNull()
    .default("10000"),
  fineAmount: numeric("fine_amount", { precision: 12, scale: 2 })
    .notNull()
    .default("300"),
  fineDeadlineDay: integer("fine_deadline_day").notNull().default(10),
  ...timeStamp,
});

export const financialDashboards = pgTable("financial_dashboards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  totalMonthsActive: integer("total_months_active").notNull().default(0),
  totalPaid: numeric("total_paid", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  accountStatus: varchar("account_status", { length: 50 })
    .notNull()
    .default("Good Standing"),
  totalPendingAmount: numeric("total_pending_amount", {
    precision: 12,
    scale: 2,
  })
    .notNull()
    .default("0"),
  totalFineAmount: numeric("total_fine_amount", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  pendingMonthsDetails: jsonb("pending_months_details").default([]).notNull(),
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow().notNull(),
  ...timeStamp,
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(user, {
    fields: [payments.userId],
    references: [user.id],
  }),
}));

export const dashboardRelations = relations(financialDashboards, ({ one }) => ({
  user: one(user, {
    fields: [financialDashboards.userId],
    references: [user.id],
  }),
}));



export const gallery = pgTable("gallery", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  category: text("category").notNull().default("সকল ছবি"),
  image: text("image").notNull(),
  imageCldPubId: text("image_cld_pub_id"),
  date: text("date"),
  location: text("location"),
  description: text("description"),
  ...timeStamp,
});

export const blogs = pgTable("blogs", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  category: text("category").notNull().default("সঞ্চয় ও বিনিয়োগ"),
  readTime: text("read_time").default("৫ মিনিট পঠিত"),
  image: text("image").notNull(),
  imageCldPubId: text("image_cld_pub_id"),
  date: text("date"),
  description: text("description"),
  fullContent: text("full_content"),
  keyTakeaways: jsonb("key_takeaways").default([]),
  authorName: text("author_name"),
  authorRole: text("author_role"),
  authorAvatar: text("author_avatar"),
  ...timeStamp,
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type SystemSettings = typeof systemSettings.$inferSelect;
export type NewSystemSettings = typeof systemSettings.$inferInsert;
export type FinancialDashboard = typeof financialDashboards.$inferSelect;
export type NewFinancialDashboard = typeof financialDashboards.$inferInsert;
export type Gallery = typeof gallery.$inferSelect;
export type NewGallery = typeof gallery.$inferInsert;
export type Blog = typeof blogs.$inferSelect;
export type NewBlog = typeof blogs.$inferInsert;
