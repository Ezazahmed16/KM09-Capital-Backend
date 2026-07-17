import { db } from "./schema/index.js";
import { user } from "./schema/auth.js";
import { payments, systemSettings, financialDashboards } from "./schema/app.js";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Seeding started...");

    // 1. Insert System Settings
    console.log("Upserting system settings...");
    await db
      .insert(systemSettings)
      .values({
        id: 1,
        defaultMonthlyFee: "10000.00",
        fineAmount: "300.00",
        fineDeadlineDay: 10,
      })
      .onConflictDoUpdate({
        target: systemSettings.id,
        set: {
          defaultMonthlyFee: "10000.00",
          fineAmount: "300.00",
          fineDeadlineDay: 10,
        },
      });

    // 2. Insert Test Users
    console.log("Upserting users...");
    const testUserId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    await db
      .insert(user)
      .values({
        id: testUserId,
        name: "Rahim Uddin",
        email: "rahim@example.com",
        emailVerified: false,
        role: "Member",
        userStatus: "Active",
      })
      .onConflictDoUpdate({
        target: user.id,
        set: {
          name: "Rahim Uddin",
          email: "rahim@example.com",
          role: "Member",
          userStatus: "Active",
        },
      });

    const adminUserId = "admin-user-id-999";
    await db
      .insert(user)
      .values({
        id: adminUserId,
        name: "Admin User",
        email: "admin@example.com",
        emailVerified: true,
        role: "Admin",
        userStatus: "Active",
      })
      .onConflictDoUpdate({
        target: user.id,
        set: {
          name: "Admin User",
          email: "admin@example.com",
          role: "Admin",
          userStatus: "Active",
        },
      });

    // 3. Clear existing payments/dashboard for clean seeding
    console.log("Cleaning up old test payments and dashboard records...");
    await db.execute(sql`TRUNCATE TABLE payments, financial_dashboards CASCADE;`);

    // 4. Insert Payments
    console.log("Seeding payments...");
    await db.insert(payments).values([
      {
        userId: testUserId,
        amount: "10000.00",
        extraFine: "0.00",
        total: "10000.00",
        paymentMonth: 1,
        paymentYear: 2026,
        paymentMethod: "Bkash",
        transactionNo: "TRX-JAN-BKASH99",
        paymentStatus: "Approved",
        paymentDate: new Date("2026-01-08"),
      },
      {
        userId: testUserId,
        amount: "10000.00",
        extraFine: "0.00",
        total: "10000.00",
        paymentMonth: 2,
        paymentYear: 2026,
        paymentMethod: "Nagad",
        transactionNo: "TRX-FEB-NAGAD77",
        paymentStatus: "Approved",
        paymentDate: new Date("2026-02-09"),
      },
      {
        userId: testUserId,
        amount: "10000.00",
        extraFine: "300.00",
        total: "10300.00",
        paymentMonth: 3,
        paymentYear: 2026,
        paymentMethod: "Bank",
        transactionNo: "TRX-MAR-BANK55",
        paymentStatus: "Pending",
        paymentDate: new Date("2026-03-15"),
      },
    ]);

    // 5. Insert Financial Dashboard
    console.log("Seeding financial dashboard...");
    await db.insert(financialDashboards).values({
      userId: testUserId,
      totalMonthsActive: 3,
      totalPaid: "20000.00",
      accountStatus: "Good Standing",
      totalPendingAmount: "10300.00",
      totalFineAmount: "300.00",
      pendingMonthsDetails: [{ month: 3, year: 2026, amount: "10300.00" }],
    });

    console.log("Seeding completed successfully! 🎉");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed with error:", error);
    process.exit(1);
  }
}

void main();
