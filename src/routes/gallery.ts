import express from 'express';
import { gallery } from '../db/schema/app.js';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '../db/schema/index.js';
import { auth } from '../lib/auth.js';

const router = express.Router();

// 1. GET All Gallery Items (Public & Dashboard access)
router.get('/', async (req, res) => {
    try {
        const { search, category, page = 1, limit = 100 } = req.query;

        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        if (search) {
            filterConditions.push(
                ilike(gallery.title, `%${search}%`)
            );
        }

        if (category && category !== 'সকল ছবি' && category !== 'all') {
            filterConditions.push(
                eq(gallery.category, category as string)
            );
        }

        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(gallery)
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        const galleryList = await db
            .select()
            .from(gallery)
            .where(whereClause)
            .orderBy(desc(gallery.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: galleryList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            }
        });
    } catch (err) {
        console.error("Get All Gallery Error:", err);
        res.status(500).json({ error: "Failed to fetch gallery items" });
    }
});

// 2. GET Single Gallery Item
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const galleryResult = await db
            .select()
            .from(gallery)
            .where(eq(gallery.id as any, id as any))
            .limit(1);

        if (galleryResult.length === 0) {
            return res.status(404).json({ error: "Gallery item not found" });
        }

        res.status(200).json({ data: galleryResult[0] });
    } catch (err) {
        console.error("Get Gallery Item Error:", err);
        res.status(500).json({ error: "Failed to fetch gallery item" });
    }
});

// Helper middleware: SuperAdmin only authorization
const checkSuperAdmin = async (req: express.Request, res: express.Response): Promise<boolean> => {
    const session = await auth.api.getSession({
        headers: req.headers
    });

    if (!session) {
        res.status(401).json({ error: "Unauthorized" });
        return false;
    }

    if (session.user.role !== "SuperAdmin") {
        res.status(403).json({ error: "Access denied: SuperAdmin only" });
        return false;
    }

    return true;
};

// 3. POST Create Gallery Item (SuperAdmin only)
router.post('/', async (req, res) => {
    try {
        const isAuthorized = await checkSuperAdmin(req, res);
        if (!isAuthorized) return;

        const { title, subtitle, category, image, imageCldPubId, date, location, description } = req.body;

        if (!title || !image) {
            return res.status(400).json({ error: "Title and Image URL are required" });
        }

        const [newGalleryItem] = await db
            .insert(gallery)
            .values({
                title,
                subtitle: subtitle || "",
                category: category || "সকল ছবি",
                image,
                imageCldPubId: imageCldPubId || "",
                date: date || "",
                location: location || "",
                description: description || "",
            })
            .returning();

        res.status(201).json({ data: newGalleryItem });
    } catch (err: any) {
        console.error("Create Gallery Error:", err);
        res.status(500).json({ error: err.message || "Failed to create gallery item" });
    }
});

// 4. PUT / PATCH Update Gallery Item (SuperAdmin only)
const updateGalleryHandler = async (req: express.Request, res: express.Response) => {
    try {
        const isAuthorized = await checkSuperAdmin(req, res);
        if (!isAuthorized) return;

        const { id } = req.params;
        const { title, subtitle, category, image, imageCldPubId, date, location, description } = req.body;

        const existingItem = await db
            .select()
            .from(gallery)
            .where(eq(gallery.id as any, id as any))
            .limit(1);

        if (existingItem.length === 0) {
            return res.status(404).json({ error: "Gallery item not found" });
        }

        const updatePayload: Record<string, any> = {};
        if (title !== undefined) updatePayload.title = title;
        if (subtitle !== undefined) updatePayload.subtitle = subtitle;
        if (category !== undefined) updatePayload.category = category;
        if (image !== undefined) updatePayload.image = image;
        if (imageCldPubId !== undefined) updatePayload.imageCldPubId = imageCldPubId;
        if (date !== undefined) updatePayload.date = date;
        if (location !== undefined) updatePayload.location = location;
        if (description !== undefined) updatePayload.description = description;

        const [updatedItem] = await db
            .update(gallery)
            .set(updatePayload)
            .where(eq(gallery.id as any, id as any))
            .returning();

        res.status(200).json({ data: updatedItem });
    } catch (err: any) {
        console.error("Update Gallery Error:", err);
        res.status(500).json({ error: err.message || "Failed to update gallery item" });
    }
};

router.put('/:id', updateGalleryHandler);
router.patch('/:id', updateGalleryHandler);

// 5. DELETE Gallery Item (SuperAdmin only)
router.delete('/:id', async (req, res) => {
    try {
        const isAuthorized = await checkSuperAdmin(req, res);
        if (!isAuthorized) return;

        const { id } = req.params;

        const existingItem = await db
            .select()
            .from(gallery)
            .where(eq(gallery.id as any, id as any))
            .limit(1);

        if (existingItem.length === 0) {
            return res.status(404).json({ error: "Gallery item not found" });
        }

        await db
            .delete(gallery)
            .where(eq(gallery.id as any, id as any));

        res.status(200).json({ message: "Gallery item deleted successfully" });
    } catch (err: any) {
        console.error("Delete Gallery Error:", err);
        res.status(500).json({ error: err.message || "Failed to delete gallery item" });
    }
});

export default router;
