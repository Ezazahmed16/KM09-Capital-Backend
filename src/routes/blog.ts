import express from 'express';
import { blogs } from '../db/schema/app.js';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '../db/schema/index.js';
import { auth } from '../lib/auth.js';

const router = express.Router();

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

// 1. GET All Blogs (Public & Dashboard access)
router.get('/', async (req, res) => {
    try {
        const { search, category, page = 1, limit = 100 } = req.query;

        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        if (search) {
            filterConditions.push(
                ilike(blogs.title, `%${search}%`)
            );
        }

        if (category && category !== 'সকল বিষয়' && category !== 'all') {
            filterConditions.push(
                eq(blogs.category, category as string)
            );
        }

        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(blogs)
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        const blogList = await db
            .select()
            .from(blogs)
            .where(whereClause)
            .orderBy(desc(blogs.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: blogList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            }
        });
    } catch (err) {
        console.error("Get All Blogs Error:", err);
        res.status(500).json({ error: "Failed to fetch blogs" });
    }
});

// 2. GET Single Blog Item
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const blogResult = await db
            .select()
            .from(blogs)
            .where(eq(blogs.id as any, id as any))
            .limit(1);

        if (blogResult.length === 0) {
            return res.status(404).json({ error: "Blog post not found" });
        }

        res.status(200).json({ data: blogResult[0] });
    } catch (err) {
        console.error("Get Blog Item Error:", err);
        res.status(500).json({ error: "Failed to fetch blog post" });
    }
});

// 3. POST Create Blog Item (SuperAdmin only)
router.post('/', async (req, res) => {
    try {
        const isAuthorized = await checkSuperAdmin(req, res);
        if (!isAuthorized) return;

        const {
            title,
            subtitle,
            category,
            readTime,
            image,
            imageCldPubId,
            date,
            description,
            fullContent,
            keyTakeaways,
            authorName,
            authorRole,
            authorAvatar
        } = req.body;

        if (!title || !image) {
            return res.status(400).json({ error: "Title and Image URL are required" });
        }

        const [newBlogItem] = await db
            .insert(blogs)
            .values({
                title,
                subtitle: subtitle || "",
                category: category || "সঞ্চয় ও বিনিয়োগ",
                readTime: readTime || "৫ মিনিট পঠিত",
                image,
                imageCldPubId: imageCldPubId || "",
                date: date || new Date().toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" }),
                description: description || "",
                fullContent: fullContent || "",
                keyTakeaways: Array.isArray(keyTakeaways) ? keyTakeaways : (keyTakeaways ? [keyTakeaways] : []),
                authorName: authorName || "Ezaz Ahmed",
                authorRole: authorRole || "Managing Director",
                authorAvatar: authorAvatar || "https://plus.unsplash.com/premium_photo-1739786995646-480d5cfd83dc?q=80&w=1160&auto=format&fit=crop",
            })
            .returning();

        res.status(201).json({ data: newBlogItem });
    } catch (err: any) {
        console.error("Create Blog Error:", err);
        res.status(500).json({ error: err.message || "Failed to create blog post" });
    }
});

// 4. PUT / PATCH Update Blog Item (SuperAdmin only)
const updateBlogHandler = async (req: express.Request, res: express.Response) => {
    try {
        const isAuthorized = await checkSuperAdmin(req, res);
        if (!isAuthorized) return;

        const { id } = req.params;
        const {
            title,
            subtitle,
            category,
            readTime,
            image,
            imageCldPubId,
            date,
            description,
            fullContent,
            keyTakeaways,
            authorName,
            authorRole,
            authorAvatar
        } = req.body;

        const existingItem = await db
            .select()
            .from(blogs)
            .where(eq(blogs.id as any, id as any))
            .limit(1);

        if (existingItem.length === 0) {
            return res.status(404).json({ error: "Blog post not found" });
        }

        const updatePayload: Record<string, any> = {
            updatedAt: new Date()
        };

        if (title !== undefined) updatePayload.title = title;
        if (subtitle !== undefined) updatePayload.subtitle = subtitle;
        if (category !== undefined) updatePayload.category = category;
        if (readTime !== undefined) updatePayload.readTime = readTime;
        if (image !== undefined) updatePayload.image = image;
        if (imageCldPubId !== undefined) updatePayload.imageCldPubId = imageCldPubId;
        if (date !== undefined) updatePayload.date = date;
        if (description !== undefined) updatePayload.description = description;
        if (fullContent !== undefined) updatePayload.fullContent = fullContent;
        if (keyTakeaways !== undefined) {
            updatePayload.keyTakeaways = Array.isArray(keyTakeaways) ? keyTakeaways : (keyTakeaways ? [keyTakeaways] : []);
        }
        if (authorName !== undefined) updatePayload.authorName = authorName;
        if (authorRole !== undefined) updatePayload.authorRole = authorRole;
        if (authorAvatar !== undefined) updatePayload.authorAvatar = authorAvatar;

        const [updatedItem] = await db
            .update(blogs)
            .set(updatePayload)
            .where(eq(blogs.id as any, id as any))
            .returning();

        res.status(200).json({ data: updatedItem });
    } catch (err: any) {
        console.error("Update Blog Error:", err);
        res.status(500).json({ error: err.message || "Failed to update blog post" });
    }
};

router.put('/:id', updateBlogHandler);
router.patch('/:id', updateBlogHandler);

// 5. DELETE Blog Item (SuperAdmin only)
router.delete('/:id', async (req, res) => {
    try {
        const isAuthorized = await checkSuperAdmin(req, res);
        if (!isAuthorized) return;

        const { id } = req.params;

        const existingItem = await db
            .select()
            .from(blogs)
            .where(eq(blogs.id as any, id as any))
            .limit(1);

        if (existingItem.length === 0) {
            return res.status(404).json({ error: "Blog post not found" });
        }

        await db
            .delete(blogs)
            .where(eq(blogs.id as any, id as any));

        res.status(200).json({ message: "Blog post deleted successfully" });
    } catch (err: any) {
        console.error("Delete Blog Error:", err);
        res.status(500).json({ error: err.message || "Failed to delete blog post" });
    }
});

export default router;
