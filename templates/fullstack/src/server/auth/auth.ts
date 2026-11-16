import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { type AppDatabase, getDb } from "@/server/db";
import { schema } from "@/server/db/schema";
import { getEnv } from "@/server/env";

function createBetterAuthInstance(db: AppDatabase) {
  const env = getEnv();

  return betterAuth({
    baseURL: env.appUrl,
    secret: env.sessionSecret,
    trustedOrigins: env.trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: false,
      },
    },
    advanced: {
      cookiePrefix: "pusula",
      useSecureCookies: env.nodeEnv === "production",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: env.nodeEnv === "production",
      },
    },
  });
}

type BetterAuthInstance = ReturnType<typeof createBetterAuthInstance>;

const authCache = new WeakMap<object, BetterAuthInstance>();

export function getAuth(db: AppDatabase = getDb()): BetterAuthInstance {
  let instance = authCache.get(db as unknown as object);
  if (!instance) {
    instance = createBetterAuthInstance(db);
    authCache.set(db as unknown as object, instance);
  }
  return instance;
}
