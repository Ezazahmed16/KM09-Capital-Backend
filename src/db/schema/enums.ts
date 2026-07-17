import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["SuperAdmin", "Admin", "Member"]);
export const userStatusEnum = pgEnum("user_status", [
  "Pending",
  "Active",
  "Inactive",
  "Suspended",
]);
