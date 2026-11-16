import crypto from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { applyMigrations, closeDb, getDbBundle } from "./index";
import {
  accounts,
  memberships,
  organizations,
  projects,
  type Role,
  users,
} from "./schema";

export const DEMO_USERS = [
  {
    id: "usr_kuzey_owner",
    name: "Defne Kara",
    email: "owner@atolyekuzey.local",
    password: "PusulaDemo!2026",
    orgId: "org_atolye_kuzey",
    role: "owner" as Role,
    alsoInSecondOrgRole: "viewer" as Role,
  },
  {
    id: "usr_kuzey_editor",
    name: "Emre Yılmaz",
    email: "editor@atolyekuzey.local",
    password: "PusulaDemo!2026",
    orgId: "org_atolye_kuzey",
    role: "editor" as Role,
  },
  {
    id: "usr_kuzey_viewer",
    name: "Selin Arslan",
    email: "viewer@atolyekuzey.local",
    password: "PusulaDemo!2026",
    orgId: "org_atolye_kuzey",
    role: "viewer" as Role,
  },
  {
    id: "usr_guney_owner",
    name: "Kerem Demir",
    email: "owner@studyoguney.local",
    password: "PusulaDemo!2026",
    orgId: "org_studyo_guney",
    role: "owner" as Role,
  },
];

async function runSeed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[db:seed] Refusing to run sample seed in NODE_ENV=production."
    );
  }

  const bundle = getDbBundle();
  await applyMigrations(bundle);
  const db = bundle.db;

  const now = new Date();
  const orgsData = [
    {
      id: "org_atolye_kuzey",
      name: "Atölye Kuzey",
      slug: "atolye-kuzey",
      studioCode: "AK",
    },
    {
      id: "org_studyo_guney",
      name: "Stüdyo Güney",
      slug: "studyo-guney",
      studioCode: "SG",
    },
  ];

  await db.transaction(async (tx) => {
    for (const org of orgsData) {
      await tx
        .insert(organizations)
        .values({ ...org, createdAt: now, updatedAt: now })
        .onConflictDoNothing();
    }

    for (const u of DEMO_USERS) {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, u.email))
        .limit(1);

      if (!existing) {
        const passwordHash = await hashPassword(u.password);
        await tx.insert(users).values({
          id: u.id,
          name: u.name,
          email: u.email,
          emailVerified: true,
          activeOrganizationId: u.orgId,
          createdAt: now,
          updatedAt: now,
        });

        await tx.insert(accounts).values({
          id: `acc_${crypto.randomUUID()}`,
          accountId: u.id,
          providerId: "credential",
          userId: u.id,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        });
      }

      await tx
        .insert(memberships)
        .values({
          id: `mem_${u.orgId}_${u.id}`,
          organizationId: u.orgId,
          userId: u.id,
          role: u.role,
          createdAt: now,
        })
        .onConflictDoNothing();

      if ("alsoInSecondOrgRole" in u && u.alsoInSecondOrgRole) {
        await tx
          .insert(memberships)
          .values({
            id: `mem_org_studyo_guney_${u.id}`,
            organizationId: "org_studyo_guney",
            userId: u.id,
            role: u.alsoInSecondOrgRole,
            createdAt: now,
          })
          .onConflictDoNothing();
      }
    }

    const seedProjects = [
      {
        id: "prj_ak_101",
        organizationId: "org_atolye_kuzey",
        code: "AK-101",
        title: "Haliç Maritime Archive Pavilion",
        clientName: "Istanbul Heritage Board",
        discipline: "architecture",
        status: "active",
        priority: "critical",
        budgetCents: 48500000,
        dueDate: new Date("2027-03-15T12:00:00Z"),
        summary: "Timber-steel hybrid conservation wing with passive daylight louvers along the Golden Horn quay.",
        createdById: "usr_kuzey_owner",
        version: 1,
      },
      {
        id: "prj_ak_102",
        organizationId: "org_atolye_kuzey",
        code: "AK-102",
        title: "Kadıköy Acoustic Rehearsal Hall",
        clientName: "Moda Chamber Ensemble",
        discipline: "interior",
        status: "review",
        priority: "high",
        budgetCents: 19200000,
        dueDate: new Date("2027-01-20T12:00:00Z"),
        summary: "Floating concrete slab isolation and perforated beech wall baffling for 180-seat chamber hall.",
        createdById: "usr_kuzey_editor",
        version: 1,
      },
      {
        id: "prj_ak_103",
        organizationId: "org_atolye_kuzey",
        code: "AK-103",
        title: "Bozcaada Coastal Footbridge Retrofit",
        clientName: "Çanakkale Coastal Directorate",
        discipline: "structural",
        status: "planning",
        priority: "medium",
        budgetCents: 12750000,
        dueDate: new Date("2027-06-01T12:00:00Z"),
        summary: "Marine-grade duplex stainless steel tension tie replacement and wind-load instrumentation.",
        createdById: "usr_kuzey_owner",
        version: 1,
      },
      {
        id: "prj_ak_104",
        organizationId: "org_atolye_kuzey",
        code: "AK-104",
        title: "Beyoğlu Courtyard Micro-Infill",
        clientName: "Pera Press Foundation",
        discipline: "urban",
        status: "archived",
        priority: "low",
        budgetCents: 8400000,
        dueDate: null,
        summary: "Completed feasibility ledger and heritage facade photogrammetry survey.",
        createdById: "usr_kuzey_editor",
        version: 1,
      },
      {
        id: "prj_sg_201",
        organizationId: "org_studyo_guney",
        code: "SG-201",
        title: "Urla Terraced Stone Winery",
        clientName: "Kıyıköy Vineyards",
        discipline: "architecture",
        status: "active",
        priority: "high",
        budgetCents: 36000000,
        dueDate: new Date("2027-04-30T12:00:00Z"),
        summary: "Gravity-flow cellar excavation with dry-stacked limestone thermal envelope.",
        createdById: "usr_guney_owner",
        version: 1,
      },
      {
        id: "prj_sg_202",
        organizationId: "org_studyo_guney",
        code: "SG-202",
        title: "Antalya Solar Canopy Transit Spine",
        clientName: "Metropolitan Mobility Office",
        discipline: "urban",
        status: "planning",
        priority: "critical",
        budgetCents: 61500000,
        dueDate: new Date("2027-08-10T12:00:00Z"),
        summary: "Modular shade truss and rainwater retention bioswales across 1.4 km boulevard.",
        createdById: "usr_guney_owner",
        version: 1,
      },
    ];

    for (const p of seedProjects) {
      await tx
        .insert(projects)
        .values({ ...p, createdAt: now, updatedAt: now })
        .onConflictDoNothing();
    }
  });

  console.log("[db:seed] Seeded Atölye Kuzey & Stüdyo Güney successfully.");
  await closeDb(bundle);
}

runSeed().catch(async (err) => {
  console.error("[db:seed] Failed:", err instanceof Error ? err.message : err);
  await closeDb().catch(() => {});
  process.exit(1);
});
