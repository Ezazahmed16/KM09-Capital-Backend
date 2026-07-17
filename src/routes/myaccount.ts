import express from 'express';
import { user } from "../db/schema/auth.js";
import { eq } from "drizzle-orm";
import { db } from "../db/schema/index.js";
import { auth } from "../lib/auth.js";

const router = express.Router();

// GET current user account details
router.get('/', async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Fetch fresh user data from DB
        const userData = await db.select()
            .from(user)
            .where(eq(user.id, session.user.id))
            .limit(1);

        if (userData.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({ data: userData[0] });
    } catch (err) {
        console.error("Get My Account Error:", err);
        res.status(500).json({ error: "Failed to get account information" });
    }
});

// UPDATE current user account details
router.put('/', async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { name, image, imageCldPubId } = req.body;

        if (!name || name.trim() === "") {
            return res.status(400).json({ error: "Name is required" });
        }

        // Update in DB
        await db.update(user)
            .set({
                name: name.trim(),
                image: image || null,
                imageCldPubId: imageCldPubId || null,
                updatedAt: new Date(),
            })
            .where(eq(user.id, session.user.id));

        // Fetch updated user data
        const updatedUserData = await db.select()
            .from(user)
            .where(eq(user.id, session.user.id))
            .limit(1);

        res.status(200).json({ data: updatedUserData[0] });
    } catch (err) {
        console.error("Update My Account Error:", err);
        res.status(500).json({ error: "Failed to update account information" });
    }
});

export default router;
