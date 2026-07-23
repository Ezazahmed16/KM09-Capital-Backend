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

        const { name, image, imageCldPubId, phoneNo, whatsappNo, location, address, note } = req.body;

        const existingUserData = await db.select()
            .from(user)
            .where(eq(user.id, session.user.id))
            .limit(1);

        if (existingUserData.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const currentUser = existingUserData[0];
        if (!currentUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const updatedName = (name && typeof name === "string" && name.trim() !== "") ? name.trim() : currentUser.name;

        // Update in DB
        await db.update(user)
            .set({
                name: updatedName,
                image: image !== undefined ? (image ? image.trim() : null) : currentUser.image,
                imageCldPubId: imageCldPubId !== undefined ? (imageCldPubId ? imageCldPubId.trim() : null) : currentUser.imageCldPubId,
                phoneNo: phoneNo !== undefined ? (phoneNo ? phoneNo.trim() : null) : currentUser.phoneNo,
                whatsappNo: whatsappNo !== undefined ? (whatsappNo ? whatsappNo.trim() : null) : currentUser.whatsappNo,
                location: location !== undefined ? (location ? location.trim() : null) : currentUser.location,
                address: address !== undefined ? (address ? address.trim() : null) : currentUser.address,
                note: note !== undefined ? (note ? note.trim() : null) : currentUser.note,
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
