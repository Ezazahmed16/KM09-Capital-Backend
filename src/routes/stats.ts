import express from 'express';
import { user } from "../db/schema/auth.js";
import { payments, systemSettings } from "../db/schema/app.js";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/schema/index.js";
import { auth } from "../lib/auth.js";

const router = express.Router();

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const SHORT_MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Helper: Calculate member's first billable month based on joining date (createdAt)
function getFirstBillableMonth(createdAtRaw: any, deadlineDay: number = 10): { startYear: number; startMonth: number } {
    const createdDate = createdAtRaw ? new Date(createdAtRaw) : new Date();
    let year = createdDate.getFullYear();
    let month = createdDate.getMonth() + 1; // 1-indexed (1..12)

    if (createdDate.getDate() > deadlineDay) {
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }

    return { startYear: year, startMonth: month };
}

// Helper: Calculate member's next payment schedule date based on joining date and paid history
function calculateNextPaymentDate(createdAtRaw: any, approvedPayments: any[], deadlineDay: number = 10): string {
    const { startYear, startMonth } = getFirstBillableMonth(createdAtRaw, deadlineDay);
    const paidSet = new Set(approvedPayments.map((p: any) => `${p.paymentYear}-${p.paymentMonth}`));

    let evalYear = startYear;
    let evalMonth = startMonth;
    const now = new Date();
    const maxFutureYears = 3;

    while (evalYear <= now.getFullYear() + maxFutureYears) {
        const key = `${evalYear}-${evalMonth}`;
        if (!paidSet.has(key)) {
            const mName = MONTH_NAMES[evalMonth - 1];
            return `${deadlineDay} ${mName} ${evalYear}`;
        }
        evalMonth++;
        if (evalMonth > 12) {
            evalMonth = 1;
            evalYear++;
        }
    }

    return `${deadlineDay} ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
}

// 1. GET Member Stats (For logged-in Member)
router.get('/member', async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const userId = session.user.id;
        const yearParam = parseInt((req.query.year as string) || `${new Date().getFullYear()}`, 10);

        // Fetch System Settings from DB
        const settingsResult = await db.select().from(systemSettings).limit(1);
        const settings = settingsResult[0];
        const monthlyFee = settings ? (parseFloat(settings.defaultMonthlyFee) || 10000) : 10000;
        const fineFee = settings ? (parseFloat(settings.fineAmount) || 300) : 300;
        const deadlineDay = settings ? (settings.fineDeadlineDay || 10) : 10;

        // Fetch user record
        const userResult = await db.select()
            .from(user)
            .where(eq(user.id as any, userId as any))
            .limit(1);

        const currentUser = userResult[0] || session.user;

        // Fetch member's payments from DB
        const memberPayments = await db.select()
            .from(payments)
            .where(eq(payments.userId as any, userId as any))
            .orderBy(desc(payments.createdAt));

        const approvedPayments = memberPayments.filter((p: any) => p.paymentStatus === 'Approved');

        const totalAmount = approvedPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.total || p.amount) || 0), 0);
        const totalMonths = approvedPayments.length;
        const totalPenalty = memberPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.extraFine) || 0), 0);
        const accountStatus = currentUser.userStatus || "Active";

        // Dynamic Next Payment Schedule Date based on joining date
        const nextPaymentDate = calculateNextPaymentDate(currentUser.createdAt, approvedPayments, deadlineDay);

        const currentMonthIdx = new Date().getMonth(); // 0-indexed
        const currentMonthNumber = currentMonthIdx + 1; // 1-indexed

        // Monthly deposit growth chart for requested year
        const monthlyDepositChart = SHORT_MONTH_NAMES.map((mShort, idx) => {
            const mInt = idx + 1; // 1-indexed (1..12)
            const monthPayments = approvedPayments.filter((p: any) => p.paymentYear === yearParam && p.paymentMonth === mInt);
            const deposit = monthPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
            return {
                month: mShort,
                fullMonth: MONTH_NAMES[idx],
                deposit,
            };
        });

        // Calculate member's first active billable month based on joining date
        const { startYear, startMonth } = getFirstBillableMonth(currentUser.createdAt, deadlineDay);

        // Paid months set for requested year
        const paidMonthsSet = new Set(
            approvedPayments
                .filter((p: any) => p.paymentYear === yearParam)
                .map((p: any) => p.paymentMonth)
        );

        const pendingMonthsTable = [];
        const now = new Date();

        let evalYear = startYear;
        let evalMonth = startMonth;

        while (evalYear < yearParam || (evalYear === yearParam && evalMonth <= currentMonthNumber)) {
            if (evalYear === yearParam) {
                if (!paidMonthsSet.has(evalMonth)) {
                    const idx = evalMonth - 1;
                    const isOverdue = evalMonth < currentMonthNumber || now.getDate() > deadlineDay;
                    pendingMonthsTable.push({
                        month: `${MONTH_NAMES[idx]} ${evalYear}`,
                        amount: monthlyFee,
                        fine: isOverdue ? fineFee : 0,
                        status: isOverdue ? "Overdue" : "Pending",
                        dueDate: `${deadlineDay} ${MONTH_NAMES[idx]} ${evalYear}`,
                    });
                }
            }
            evalMonth++;
            if (evalMonth > 12) {
                evalMonth = 1;
                evalYear++;
            }
        }

        res.status(200).json({
            data: {
                totalAmount,
                totalMonths,
                totalPenalty,
                accountStatus,
                nextPaymentDate,
                selectedYear: yearParam,
                monthlyDepositChart,
                pendingMonthsTable,
                recentPayments: memberPayments.slice(0, 5),
            }
        });
    } catch (err: any) {
        console.error("Member Stats Error:", err);
        res.status(500).json({ error: err.message || "Failed to fetch member statistics" });
    }
});

// 2. GET Admin Stats (For SuperAdmin & Admin)
router.get('/admin', async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (session.user.role !== "SuperAdmin" && session.user.role !== "Admin") {
            return res.status(403).json({ error: "Access denied: Admins only" });
        }

        // Fetch System Settings from DB
        const settingsResult = await db.select().from(systemSettings).limit(1);
        const settings = settingsResult[0];
        const monthlyFee = settings ? (parseFloat(settings.defaultMonthlyFee) || 10000) : 10000;
        const fineFee = settings ? (parseFloat(settings.fineAmount) || 300) : 300;
        const deadlineDay = settings ? (settings.fineDeadlineDay || 10) : 10;

        const yearParam = parseInt((req.query.year as string) || `${new Date().getFullYear()}`, 10);

        // Fetch all users from DB
        const allUsers = await db.select().from(user);
        const totalUsers = allUsers.length;
        const activeMembersCount = allUsers.filter((u: any) => u.userStatus === 'Active').length;
        const pendingMembersCount = allUsers.filter((u: any) => u.userStatus !== 'Active').length;

        // Fetch all payments from DB
        const allPayments = await db.select().from(payments);
        const approvedPayments = allPayments.filter((p: any) => p.paymentStatus === 'Approved');

        const activeMonthRevenue = approvedPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.total || p.amount) || 0), 0);
        const pendingPenalties = allPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.extraFine) || 0), 0);

        // Monthly Active Members Payment Chart Data for yearParam
        const monthlyActivePaymentsChart = SHORT_MONTH_NAMES.map((mShort, idx) => {
            const mInt = idx + 1; // 1-indexed (1..12)
            const mApprovedPayments = approvedPayments.filter((p: any) => p.paymentYear === yearParam && p.paymentMonth === mInt);
            const mAllPayments = allPayments.filter((p: any) => p.paymentYear === yearParam && p.paymentMonth === mInt);

            const activeMembersSet = new Set(mApprovedPayments.map((p: any) => p.userId));
            const revenue = mApprovedPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.total || p.amount) || 0), 0);
            const penalties = mAllPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.extraFine) || 0), 0);

            return {
                month: mShort,
                fullMonth: MONTH_NAMES[idx],
                activeMembers: activeMembersSet.size,
                revenue,
                penalties,
            };
        });

        // Pending Payments Table of Users (Considering individual user joining dates for yearParam)
        const userApprovedMonthsMap: Record<string, Set<number>> = {};
        allUsers.forEach((u: any) => {
            userApprovedMonthsMap[u.id] = new Set<number>();
        });

        approvedPayments.forEach((p: any) => {
            if (p.userId && p.paymentYear === yearParam && userApprovedMonthsMap[p.userId]) {
                userApprovedMonthsMap[p.userId]!.add(p.paymentMonth);
            }
        });

        const currentMonthIdx = new Date().getMonth();
        const currentMonthNumber = currentMonthIdx + 1;
        const now = new Date();
        const pendingPaymentsOfUsers = [];

        for (const u of allUsers) {
            const paidSet = userApprovedMonthsMap[u.id] || new Set<number>();
            const { startYear, startMonth } = getFirstBillableMonth(u.createdAt, deadlineDay);

            let pendingMonthsCount = 0;
            let totalPenalty = 0;

            let evalYear = startYear;
            let evalMonth = startMonth;

            while (evalYear < yearParam || (evalYear === yearParam && evalMonth <= currentMonthNumber)) {
                if (evalYear === yearParam) {
                    if (!paidSet.has(evalMonth)) {
                        pendingMonthsCount++;
                        const isOverdue = evalMonth < currentMonthNumber || now.getDate() > deadlineDay;
                        if (isOverdue) {
                            totalPenalty += fineFee;
                        }
                    }
                }
                evalMonth++;
                if (evalMonth > 12) {
                    evalMonth = 1;
                    evalYear++;
                }
            }

            if (pendingMonthsCount > 0) {
                pendingPaymentsOfUsers.push({
                    userId: u.id,
                    userName: u.name,
                    userEmail: u.email,
                    userPhone: u.phoneNo,
                    userRole: u.role,
                    userStatus: u.userStatus,
                    userAvatar: u.image || "",
                    pendingMonthsCount,
                    totalPendingAmount: pendingMonthsCount * monthlyFee,
                    totalPenalty,
                });
            }
        }

        res.status(200).json({
            data: {
                totalUsers,
                activeMembersCount,
                pendingMembersCount,
                activeMonthRevenue,
                pendingPenalties,
                monthlyActivePaymentsChart,
                pendingPaymentsOfUsers,
                selectedYear: yearParam,
            }
        });
    } catch (err: any) {
        console.error("Admin Stats Error:", err);
        res.status(500).json({ error: err.message || "Failed to fetch admin statistics" });
    }
});

export default router;
