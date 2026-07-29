import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/schema/index.js";
import * as schema from "../db/schema/auth.js";

const sanitizeOrigin = (url: string) => {
    return url.trim().replace(/['"]/g, "").replace(/\/$/, "");
};

const frontendUrl = process.env.FRONTEND_URL ? sanitizeOrigin(process.env.FRONTEND_URL) : "";

const trustedOrigins = [
    frontendUrl,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://*.vercel.app",
    "https://km09-capital.com",
    "https://www.km09-capital.com",
    "https://*.km09-capital.com"
].filter(Boolean);

if (process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
    const extra = process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")
        .map(o => sanitizeOrigin(o))
        .filter(Boolean);
    trustedOrigins.push(...extra);
}

const rawAuthUrl = process.env.BETTER_AUTH_URL
    ? sanitizeOrigin(process.env.BETTER_AUTH_URL)
    : "";

const getBaseUrl = () => {
    if (rawAuthUrl) {
        return rawAuthUrl.endsWith("/api/auth")
            ? rawAuthUrl
            : (rawAuthUrl.endsWith("/api") ? `${rawAuthUrl}/auth` : `${rawAuthUrl}/api/auth`);
    }
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}/api/auth`;
    }
    return `http://localhost:${process.env.PORT || 8000}/api/auth`;
};

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: getBaseUrl(),
    trustedOrigins,
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
            phoneNo: {
                type: "string", required: false, input: true
            },
            whatsappNo: {
                type: "string", required: false, input: true
            },
            location: {
                type: "string", required: false, input: true
            },
            address: {
                type: "string", required: false, input: true
            },
            note: {
                type: "string", required: false, input: true
            },
        }
    },
    advanced: {
        ipAddress: {
            ipAddressHeaders: ["x-forwarded-for"]
        },
        crossSubDomainCookies: {
            enabled: process.env.ENABLE_CROSS_SUBDOMAIN_COOKIES === "true",
            ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
        },
        defaultCookieAttributes: {
            sameSite: "none",
            secure: true
        }
    }
});