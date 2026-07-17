import express from 'express';
import { payments } from "../db/schema/app.js";
import { user } from "../db/schema/auth.js";
import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { db } from "../db/schema/index.js";
import { auth } from "../lib/auth.js";

const router = express.Router();

// Get Payments List
router.get('/', async (req, res) => {
    try {
        // 1. Authenticate user session
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // 2. Extract query parameters from the request
        const { search, paymentMethods, status, page = 1, limit = 10 } = req.query;

        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);
        const offset = (currentPage - 1) * limitPerPage;

        // 3. Initialize SQL filter conditions
        const filterConditions = [];

        // Enforce that users only see their own payments on this route
        filterConditions.push(eq(payments.userId, session.user.id));

        // Apply Search (Transaction ID or Member Name)
        if (search) {
            filterConditions.push(
                or(
                    ilike(payments.transactionNo, `%${search}%`),
                    ilike(user.name, `%${search}%`)
                )
            );
        }

        // Apply Payment Method filter
        if (paymentMethods) {
            filterConditions.push(
                ilike(payments.paymentMethod, `%${paymentMethods}%`)
            );
        }

        // Apply Status filter (Fix filtering options)
        if (status && status !== "all") {
            filterConditions.push(
                eq(payments.paymentStatus, status as any)
            );
        }

        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        // 4. Get total count of matching payments
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(payments)
            .leftJoin(user, eq(payments.userId, user.id))
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        // 5. Fetch actual paginated payments
        const paymentsList = await db.select({
            ...getTableColumns(payments),
            user: { ...getTableColumns(user) }
        })
            .from(payments)
            .leftJoin(user, eq(payments.userId, user.id))
            .where(whereClause)
            .orderBy(desc(payments.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: paymentsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            }
        });

    } catch (err) {
        console.error("Get Payments Error:", err);
        res.status(500).json({ error: "Something went wrong fetching payments list" });
    }
});

// Create Payment
router.post('/', async (req, res) => {
    try {
        // 1. Authenticate user session
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { amount, extraFine, total, paymentMonth, paymentYear, paymentMethod, transactionNo, note, paymentStatus, paymentDate } = req.body;

        if (!amount || !paymentMonth || !paymentYear || !paymentMethod) {
            return res.status(400).json({ error: "Missing required payment fields" });
        }

        // Security check: Members can only submit payments for themselves
        const targetUserId = session.user.role === "Member" ? session.user.id : (req.body.userId || session.user.id);

        // 2. Insert new payment record
        const newPayment = await db.insert(payments).values({
            userId: targetUserId,
            amount,
            extraFine: extraFine || "0.00",
            total,
            paymentMonth: parseInt(paymentMonth),
            paymentYear: parseInt(paymentYear),
            paymentMethod: paymentMethod as any,
            transactionNo: transactionNo || null,
            paymentStatus: paymentStatus || "Pending",
            note: note || null,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        }).returning();

        res.status(201).json({ data: newPayment[0] });
    } catch (err: any) {
        console.error("Create Payment Error:", err);
        res.status(500).json({ error: err.message || "Failed to submit payment details" });
    }
});

// Get Single Payment Details
router.get('/:id', async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { id } = req.params;

        const paymentResult = await db.select({
            ...getTableColumns(payments),
            user: { ...getTableColumns(user) }
        })
            .from(payments)
            .leftJoin(user, eq(payments.userId, user.id))
            .where(eq(payments.id, id))
            .limit(1);

        if (paymentResult.length === 0) {
            return res.status(404).json({ error: "Payment record not found" });
        }

        const paymentData = paymentResult[0];

        // Members can only view their own payments
        if (session.user.role === "Member" && paymentData?.userId !== session.user.id) {
            return res.status(403).json({ error: "Access denied" });
        }

        res.status(200).json({ data: paymentData });
    } catch (err) {
        console.error("Get Payment Details Error:", err);
        res.status(500).json({ error: "Failed to fetch payment details" });
    }
});

// Update Payment (Admins/SuperAdmins can update paymentStatus)
const updatePaymentHandler = async (req: express.Request, res: express.Response) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Only Admins or SuperAdmins can update payments
        if (session.user.role !== "SuperAdmin" && session.user.role !== "Admin") {
            return res.status(403).json({ error: "Access denied: Admins only" });
        }

        const { id } = req.params;
        const { paymentStatus } = req.body;

        if (!paymentStatus) {
            return res.status(400).json({ error: "Status is required" });
        }

        await db.update(payments)
            .set({
                paymentStatus,
                updatedAt: new Date()
            })
            .where(eq(payments.id as any, id as any));

        // Fetch updated payment
        const updatedPaymentResult = await db.select({
            ...getTableColumns(payments),
            user: { ...getTableColumns(user) }
        })
            .from(payments)
            .leftJoin(user, eq(payments.userId, user.id))
            .where(eq(payments.id as any, id as any))
            .limit(1);

        res.status(200).json({ data: updatedPaymentResult[0] });
    } catch (err: any) {
        console.error("Update Payment Error:", err);
        res.status(500).json({ error: err.message || "Failed to update payment status" });
    }
};

router.put('/:id', updatePaymentHandler);
router.patch('/:id', updatePaymentHandler);

export default router;