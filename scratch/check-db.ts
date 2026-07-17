import { db } from "../src/db/schema/index.js";
import { users, payments } from "../src/db/schema/app.js";

async function check() {
  try {
    const allUsers = await db.select().from(users);
    console.log("Users in DB:", allUsers.length, allUsers);
    const allPayments = await db.select().from(payments);
    console.log("Payments in DB:", allPayments.length, allPayments);
  } catch (err) {
    console.error("DB Check error:", err);
  }
}

check();
