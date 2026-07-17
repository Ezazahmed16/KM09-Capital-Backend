import { eq } from "drizzle-orm";

import { db as index, pool } from "./db/schema/index.js";
import { financialDashboards, payments, systemSettings, user } from "./schema.js";

async function main() {
  try {
    console.log("Performing app schema CRUD operations...");

    const [settings] = await index
      .insert(systemSettings)
      .values({
        id: 1,
        defaultMonthlyFee: "10000",
        fineAmount: "300",
        fineDeadlineDay: 10,
      })
      .onConflictDoUpdate({
        target: systemSettings.id,
        set: {
          defaultMonthlyFee: "10000",
          fineAmount: "300",
          fineDeadlineDay: 10,
        },
      })
      .returning();

    if (!settings) {
      throw new Error("Failed to create system settings");
    }

    console.log("UPSERT: System settings saved:", settings);

    const [newUser] = await index
      .insert(user)
      .values({
        id: `test-user-${Date.now()}`,
        name: "Admin User",
        email: `admin.${Date.now()}@example.com`,
        emailVerified: false,
        role: "Admin",
        userStatus: "Active",
      })
      .returning();

    if (!newUser) {
      throw new Error("Failed to create user");
    }

    console.log("CREATE: User created:", newUser);

    const [dashboard] = await index
      .insert(financialDashboards)
      .values({
        userId: newUser.id,
        totalMonthsActive: 1,
        totalPaid: "0",
        accountStatus: "Good Standing",
        totalPendingAmount: "10300",
        totalFineAmount: "300",
        pendingMonthsDetails: [{ month: 7, year: 2026, amount: "10300" }],
      })
      .returning();

    if (!dashboard) {
      throw new Error("Failed to create financial dashboard");
    }

    console.log("CREATE: Financial dashboard created:", dashboard);

    const [newPayment] = await index
      .insert(payments)
      .values({
        userId: newUser.id,
        paymentMonth: 7,
        paymentYear: 2026,
        amount: settings.defaultMonthlyFee,
        extraFine: settings.fineAmount,
        total: "10300",
        paymentMethod: "Bkash",
        transactionNo: `TRX-${Date.now()}`,
        paymentStatus: "Pending",
        note: "Monthly payment with late fine",
      })
      .returning();

    if (!newPayment) {
      throw new Error("Failed to create payment");
    }

    console.log("CREATE: Payment created:", newPayment);

    const foundPayment = await index
      .select()
      .from(payments)
      .where(eq(payments.id, newPayment.id));

    console.log("READ: Found payment:", foundPayment[0]);

    const [updatedPayment] = await index
      .update(payments)
      .set({ paymentStatus: "Approved", note: "Payment approved by admin" })
      .where(eq(payments.id, newPayment.id))
      .returning();

    if (!updatedPayment) {
      throw new Error("Failed to update payment");
    }

    console.log("UPDATE: Payment updated:", updatedPayment);

    await index.delete(payments).where(eq(payments.id, newPayment.id));
    await index
      .delete(financialDashboards)
      .where(eq(financialDashboards.id, dashboard.id));
    await index.delete(user).where(eq(user.id, newUser.id));
    console.log("DELETE: Payment, dashboard, and user deleted.");

    console.log("\nApp schema CRUD operations completed successfully.");
  } catch (error) {
    console.error("Error performing CRUD operations:", error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      console.log("Database pool closed.");
    }
  }
}

void main();
