import express from 'express';
import { payments } from "../db/schema/app.js";
import { user } from "../db/schema/auth.js";
import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { db } from "../db/schema/index.js";
import { auth } from "../lib/auth.js";

const router = express.Router();

// 1. Get All Payments for All Users (Admins/SuperAdmins only)
router.get('/', async (req, res) => {
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

        const { search, status, paymentMethods, page = 1, limit = 10 } = req.query;

        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        // Search by transaction no or user name
        if (search) {
            filterConditions.push(
                or(
                    ilike(payments.transactionNo, `%${search}%`),
                    ilike(user.name, `%${search}%`)
                )
            );
        }

        // Filter by payment status
        if (status && status !== "all") {
            filterConditions.push(
                eq(payments.paymentStatus, status as any)
            );
        }

        // Filter by payment method
        if (paymentMethods && paymentMethods !== "all") {
            filterConditions.push(
                eq(payments.paymentMethod, paymentMethods as any)
            );
        }

        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        // Get total count of matching payments
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(payments)
            .leftJoin(user, eq(payments.userId, user.id))
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        // Fetch paginated payments list with nested user info
        const paymentsList = await db
            .select({
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
        console.error("Get All Payments Error:", err);
        res.status(500).json({ error: "Something went wrong Get All Payments Error" });
    }
});

// 2. Get Single Payment Details (Admins/SuperAdmins only)
router.get('/:id', async (req, res) => {
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

        const { id } = req.params;

        const paymentResult = await db.select({
            ...getTableColumns(payments),
            user: { ...getTableColumns(user) }
        })
            .from(payments)
            .leftJoin(user, eq(payments.userId, user.id))
            .where(eq(payments.id as any, id as any))
            .limit(1);

        if (paymentResult.length === 0) {
            return res.status(404).json({ error: "Payment record not found" });
        }

        res.status(200).json({ data: paymentResult[0] });
    } catch (err) {
        console.error("Get Payment Details Error:", err);
        res.status(500).json({ error: "Failed to fetch payment details" });
    }
});

// 3. Update Payment (Admins/SuperAdmins can update paymentStatus)
const updatePaymentHandler = async (req: express.Request, res: express.Response) => {
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
