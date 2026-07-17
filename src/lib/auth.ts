import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/schema/index.js";
import * as schema from "../db/schema/auth.js";

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: [process.env.FRONTEND_URL!],
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    passwordReset: {
        enabled: true,
    },
    user: {
        additionalFields: {
            role: {
                type: "string", required: false, default: "Member", input: true
            },
            imageCldPubId: {
                type: "string", required: false, input: true
            },
            userStatus: {
                type: "string", required: false, default: "Pending", input: true
            },
        }
    }
});