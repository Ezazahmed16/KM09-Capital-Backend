import express from 'express';
import { user } from "../db/schema/auth.js";
import { payments } from "../db/schema/app.js";
import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { db } from "../db/schema/index.js";
import { auth } from "../lib/auth.js";

const router = express.Router();

// Get All Members with Search by Name, Filter by Status
router.get('/', async (req, res) => {
    try {
        const { search, status, page = 1, limit = 100 } = req.query;

        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        // Search by name
        if (search) {
            filterConditions.push(
                ilike(user.name, `%${search}%`)
            );
        }

        // Filter by user status
        if (status && status !== "all") {
            filterConditions.push(
                eq(user.userStatus, status as any)
            );
        }

        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        // Get total count of matching members
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(user)
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        // Fetch paginated members list
        const membersList = await db
            .select({
                ...getTableColumns(user),
            })
            .from(user)
            .where(whereClause)
            .orderBy(desc(user.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: membersList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            }
        });

    } catch (err) {
        console.error("Get All Members Error:", err);
        res.status(500).json({ error: "Something went wrong Get All Members Error" });
    }
});

// GET Member Payments History by Member ID
router.get('/:id/payments', async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { id } = req.params;

        const memberPayments = await db.select()
            .from(payments)
            .where(eq(payments.userId as any, id as any))
            .orderBy(desc(payments.createdAt));

        const approvedPayments = memberPayments.filter((p: any) => p.paymentStatus === 'Approved');
        const totalPaid = approvedPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.total || p.amount) || 0), 0);
        const totalFines = memberPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.extraFine) || 0), 0);

        res.status(200).json({
            data: memberPayments,
            summary: {
                totalPaid,
                totalFines,
                totalMonthsPaid: approvedPayments.length,
            }
        });
    } catch (err: any) {
        console.error("Get Member Payments Error:", err);
        res.status(500).json({ error: err.message || "Failed to fetch member payment history" });
    }
});

// GET Single Member details
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

        const memberResult = await db.select()
            .from(user)
            .where(eq(user.id as any, id as any))
            .limit(1);

        if (memberResult.length === 0) {
            return res.status(404).json({ error: "Member not found" });
        }

        res.status(200).json({ data: memberResult[0] });
    } catch (err) {
        console.error("Get Member Details Error:", err);
        res.status(500).json({ error: "Failed to fetch member details" });
    }
});

// Update Member status or role
const updateMemberHandler = async (req: express.Request, res: express.Response) => {
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
        const { userStatus, role } = req.body;

        if (!userStatus && !role) {
            return res.status(400).json({ error: "Status or role is required for update" });
        }

        const updatePayload: Record<string, any> = {
            updatedAt: new Date()
        };

        if (userStatus) {
            updatePayload.userStatus = userStatus;
        }

        if (role) {
            if (session.user.role !== "SuperAdmin") {
                return res.status(403).json({ error: "Access denied: Only SuperAdmin can modify user roles" });
            }
            updatePayload.role = role;
        }

        await db.update(user)
            .set(updatePayload)
            .where(eq(user.id as any, id as any));

        const updatedMemberResult = await db.select()
            .from(user)
            .where(eq(user.id as any, id as any))
            .limit(1);

        res.status(200).json({ data: updatedMemberResult[0] });
    } catch (err: any) {
        console.error("Update Member Error:", err);
        res.status(500).json({ error: err.message || "Failed to update member" });
    }
};

router.put('/:id', updateMemberHandler);
router.patch('/:id', updateMemberHandler);

export default router;
