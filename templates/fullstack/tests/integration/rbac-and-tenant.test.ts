import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { GET as meHandler } from "@/app/api/auth/me/route";
import { GET as listOrgsHandler } from "@/app/api/organizations/route";
import { POST as switchOrgHandler } from "@/app/api/organizations/switch/route";
import {
  DELETE as deleteProjectHandler,
  GET as getProjectHandler,
  PATCH as patchProjectHandler,
} from "@/app/api/projects/[id]/route";
import { GET as listProjectsHandler, POST as createProjectHandler } from "@/app/api/projects/route";
import type { DatabaseBundle } from "@/server/db";
import { memberships, organizations } from "@/server/db/schema";
import {
  extractSessionCookieHeader,
  jsonRequest,
  resetTestDatabase,
  seedMemberInOrg,
  setupTestDatabase,
  teardownTestDatabase,
} from "./test-helpers";

describe("Multi-organization RBAC, tenant isolation, validation, CSRF & concurrency", () => {
  let bundle: DatabaseBundle;

  beforeAll(async () => {
    bundle = await setupTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase(bundle);
  });

  afterAll(async () => {
    await teardownTestDatabase(bundle);
  });

  async function loginAs(email: string, password: string): Promise<string> {
    const res = await loginHandler(
      jsonRequest("/api/auth/login", {
        method: "POST",
        body: { email, password },
      })
    );
    expect(res.status).toBe(200);
    return extractSessionCookieHeader(res);
  }

  it("rejects unauthenticated access across protected endpoints with 401", async () => {
    expect((await meHandler(jsonRequest("/api/auth/me"))).status).toBe(401);
    expect((await listOrgsHandler(jsonRequest("/api/organizations"))).status).toBe(401);
    expect((await listProjectsHandler(jsonRequest("/api/projects"))).status).toBe(401);
    expect(
      (
        await createProjectHandler(
          jsonRequest("/api/projects", {
            method: "POST",
            body: { code: "AK-1", title: "Test", clientName: "Client" },
          })
        )
      ).status
    ).toBe(401);
    expect(
      (
        await getProjectHandler(jsonRequest("/api/projects/prj_missing"), {
          params: Promise.resolve({ id: "prj_missing" }),
        })
      ).status
    ).toBe(401);
  });

  it("enforces viewer read-only (403) and editor no-delete (403) RBAC rules", async () => {
    await seedMemberInOrg(bundle, {
      organizationId: "org_a",
      organizationName: "Atölye A",
      organizationSlug: "atolye-a",
      email: "owner@a.test",
      name: "Owner A",
      password: "Password!2026",
      role: "owner",
    });
    await seedMemberInOrg(bundle, {
      organizationId: "org_a",
      organizationName: "Atölye A",
      organizationSlug: "atolye-a",
      email: "editor@a.test",
      name: "Editor A",
      password: "Password!2026",
      role: "editor",
    });
    await seedMemberInOrg(bundle, {
      organizationId: "org_a",
      organizationName: "Atölye A",
      organizationSlug: "atolye-a",
      email: "viewer@a.test",
      name: "Viewer A",
      password: "Password!2026",
      role: "viewer",
    });

    const ownerCookie = await loginAs("owner@a.test", "Password!2026");
    const editorCookie = await loginAs("editor@a.test", "Password!2026");
    const viewerCookie = await loginAs("viewer@a.test", "Password!2026");

    // Editor CAN create & update
    const editorCreate = await createProjectHandler(
      jsonRequest("/api/projects", {
        method: "POST",
        cookie: editorCookie,
        body: {
          code: "AA-101",
          title: "Timber Canopy",
          clientName: "Civic Trust",
          budgetCents: 1200000,
        },
      })
    );
    expect(editorCreate.status).toBe(201);
    const createdProject = (await editorCreate.json()).project;

    const editorPatch = await patchProjectHandler(
      jsonRequest(`/api/projects/${createdProject.id}`, {
        method: "PATCH",
        cookie: editorCookie,
        body: { version: 1, status: "active" },
      }),
      { params: Promise.resolve({ id: createdProject.id }) }
    );
    expect(editorPatch.status).toBe(200);

    // Editor CANNOT delete -> 403
    const editorDelete = await deleteProjectHandler(
      jsonRequest(`/api/projects/${createdProject.id}`, {
        method: "DELETE",
        cookie: editorCookie,
      }),
      { params: Promise.resolve({ id: createdProject.id }) }
    );
    expect(editorDelete.status).toBe(403);

    // Viewer CAN read list & single, CANNOT create/patch/delete -> 403
    const viewerList = await listProjectsHandler(
      jsonRequest("/api/projects", { cookie: viewerCookie })
    );
    expect(viewerList.status).toBe(200);
    expect((await viewerList.json()).items).toHaveLength(1);

    const viewerGet = await getProjectHandler(
      jsonRequest(`/api/projects/${createdProject.id}`, { cookie: viewerCookie }),
      { params: Promise.resolve({ id: createdProject.id }) }
    );
    expect(viewerGet.status).toBe(200);

    const viewerCreate = await createProjectHandler(
      jsonRequest("/api/projects", {
        method: "POST",
        cookie: viewerCookie,
        body: { code: "AA-102", title: "Blocked", clientName: "Client" },
      })
    );
    expect(viewerCreate.status).toBe(403);

    const viewerPatch = await patchProjectHandler(
      jsonRequest(`/api/projects/${createdProject.id}`, {
        method: "PATCH",
        cookie: viewerCookie,
        body: { version: 2, title: "Hacked" },
      }),
      { params: Promise.resolve({ id: createdProject.id }) }
    );
    expect(viewerPatch.status).toBe(403);

    const viewerDelete = await deleteProjectHandler(
      jsonRequest(`/api/projects/${createdProject.id}`, {
        method: "DELETE",
        cookie: viewerCookie,
      }),
      { params: Promise.resolve({ id: createdProject.id }) }
    );
    expect(viewerDelete.status).toBe(403);

    // Owner CAN delete
    const ownerDelete = await deleteProjectHandler(
      jsonRequest(`/api/projects/${createdProject.id}`, {
        method: "DELETE",
        cookie: ownerCookie,
      }),
      { params: Promise.resolve({ id: createdProject.id }) }
    );
    expect(ownerDelete.status).toBe(200);
  });

  it("isolates Org A and Org B on list/get/patch/delete and blocks unauthorized org switching", async () => {
    await seedMemberInOrg(bundle, {
      organizationId: "org_alpha",
      organizationName: "Alpha Studio",
      organizationSlug: "alpha-studio",
      email: "alpha@studio.test",
      name: "Alpha Owner",
      password: "Password!2026",
      role: "owner",
    });
    await seedMemberInOrg(bundle, {
      organizationId: "org_beta",
      organizationName: "Beta Studio",
      organizationSlug: "beta-studio",
      email: "beta@studio.test",
      name: "Beta Owner",
      password: "Password!2026",
      role: "owner",
    });

    const alphaCookie = await loginAs("alpha@studio.test", "Password!2026");
    const betaCookie = await loginAs("beta@studio.test", "Password!2026");

    const alphaCreate = await createProjectHandler(
      jsonRequest("/api/projects", {
        method: "POST",
        cookie: alphaCookie,
        body: { code: "AL-101", title: "Alpha Secret Bridge", clientName: "Alpha Client" },
      })
    );
    expect(alphaCreate.status).toBe(201);
    const alphaProjectId = (await alphaCreate.json()).project.id as string;

    // Beta listing sees 0 items
    const betaList = await listProjectsHandler(jsonRequest("/api/projects", { cookie: betaCookie }));
    expect(betaList.status).toBe(200);
    expect((await betaList.json()).items).toHaveLength(0);

    // Beta attempting GET/PATCH/DELETE on Alpha's project ID is denied (404)
    expect(
      (
        await getProjectHandler(
          jsonRequest(`/api/projects/${alphaProjectId}`, { cookie: betaCookie }),
          { params: Promise.resolve({ id: alphaProjectId }) }
        )
      ).status
    ).toBe(404);

    expect(
      (
        await patchProjectHandler(
          jsonRequest(`/api/projects/${alphaProjectId}`, {
            method: "PATCH",
            cookie: betaCookie,
            body: { version: 1, title: "Tampered" },
          }),
          { params: Promise.resolve({ id: alphaProjectId }) }
        )
      ).status
    ).toBe(404);

    expect(
      (
        await deleteProjectHandler(
          jsonRequest(`/api/projects/${alphaProjectId}`, {
            method: "DELETE",
            cookie: betaCookie,
          }),
          { params: Promise.resolve({ id: alphaProjectId }) }
        )
      ).status
    ).toBe(404);

    // Beta attempting to switch into Alpha org is rejected 403
    const evilSwitch = await switchOrgHandler(
      jsonRequest("/api/organizations/switch", {
        method: "POST",
        cookie: betaCookie,
        body: { targetOrganizationId: "org_alpha" },
      })
    );
    expect(evilSwitch.status).toBe(403);
  });

  it("rejects mass-assignment fields, invalid input/pagination bounds, and cross-origin CSRF", async () => {
    await seedMemberInOrg(bundle, {
      organizationId: "org_sec",
      organizationName: "Sec Studio",
      organizationSlug: "sec-studio",
      email: "sec@studio.test",
      name: "Sec Owner",
      password: "Password!2026",
      role: "owner",
    });
    const cookie = await loginAs("sec@studio.test", "Password!2026");

    // Mass-assignment attempts -> 400
    for (const extraField of [
      { role: "owner" },
      { organizationId: "org_other" },
      { tenantId: "org_other" },
      { ownerId: "usr_other" },
      { createdById: "usr_other" },
    ]) {
      const res = await createProjectHandler(
        jsonRequest("/api/projects", {
          method: "POST",
          cookie,
          body: {
            code: "SC-101",
            title: "Mass Assignment Check",
            clientName: "Client",
            ...extraField,
          },
        })
      );
      expect(res.status).toBe(400);
    }

    // Input & pagination bounds -> 400
    expect(
      (
        await listProjectsHandler(
          jsonRequest("/api/projects?limit=100", { cookie })
        )
      ).status
    ).toBe(400);

    expect(
      (
        await listProjectsHandler(
          jsonRequest("/api/projects?page=0", { cookie })
        )
      ).status
    ).toBe(400);

    expect(
      (
        await listProjectsHandler(
          jsonRequest("/api/projects?status=invalid_state", { cookie })
        )
      ).status
    ).toBe(400);

    expect(
      (
        await createProjectHandler(
          jsonRequest("/api/projects", {
            method: "POST",
            cookie,
            body: {
              code: "SC-102",
              title: "Negative Fee",
              clientName: "Client",
              budgetCents: -50,
            },
          })
        )
      ).status
    ).toBe(400);

    // Malicious cross-origin CSRF -> 403 CSRF_ORIGIN_MISMATCH
    const evilOriginRes = await createProjectHandler(
      jsonRequest("/api/projects", {
        method: "POST",
        cookie,
        origin: "https://evil.attacker.example",
        body: { code: "SC-103", title: "CSRF Attack", clientName: "Evil" },
      })
    );
    expect(evilOriginRes.status).toBe(403);
    expect((await evilOriginRes.json()).error.code).toBe("CSRF_ORIGIN_MISMATCH");

    const nullOriginRes = await createProjectHandler(
      jsonRequest("/api/projects", {
        method: "POST",
        cookie,
        origin: "null",
        body: { code: "SC-104", title: "Null Origin", clientName: "Evil" },
      })
    );
    expect(nullOriginRes.status).toBe(403);

    const missingOriginWithCookie = await createProjectHandler(
      jsonRequest("/api/projects", {
        method: "POST",
        cookie,
        origin: null,
        body: { code: "SC-105", title: "No Origin", clientName: "Evil" },
      })
    );
    expect(missingOriginWithCookie.status).toBe(403);
  });

  it("handles duplicate project codes, idempotency replay, optimistic locking, and persistence across requests", async () => {
    await seedMemberInOrg(bundle, {
      organizationId: "org_conc",
      organizationName: "Concurrency Studio",
      organizationSlug: "conc-studio",
      email: "conc@studio.test",
      name: "Conc Owner",
      password: "Password!2026",
      role: "owner",
    });
    const cookie = await loginAs("conc@studio.test", "Password!2026");

    // 1. Idempotent create prevents duplicate rows on retry
    const firstCreate = await createProjectHandler(
      jsonRequest("/api/projects", {
        method: "POST",
        cookie,
        headers: { "Idempotency-Key": "idem-create-101" },
        body: { code: "CC-101", title: "Stone Pavilion", clientName: "City Arts" },
      })
    );
    expect(firstCreate.status).toBe(201);
    const created = (await firstCreate.json()).project;

    const replayCreate = await createProjectHandler(
      jsonRequest("/api/projects", {
        method: "POST",
        cookie,
        headers: { "Idempotency-Key": "idem-create-101" },
        body: { code: "CC-101", title: "Stone Pavilion", clientName: "City Arts" },
      })
    );
    expect(replayCreate.status).toBe(200);
    const replayed = await replayCreate.json();
    expect(replayed.replayed).toBe(true);
    expect(replayed.project.id).toBe(created.id);

    // Same Idempotency-Key with different payload -> 409
    const mismatchIdem = await createProjectHandler(
      jsonRequest("/api/projects", {
        method: "POST",
        cookie,
        headers: { "Idempotency-Key": "idem-create-101" },
        body: { code: "CC-999", title: "Different", clientName: "Other" },
      })
    );
    expect(mismatchIdem.status).toBe(409);

    // Duplicate (organizationId, code) without same idempotency key -> 409
    const duplicateCodeRes = await createProjectHandler(
      jsonRequest("/api/projects", {
        method: "POST",
        cookie,
        body: { code: "cc-101", title: "Duplicate Code", clientName: "Other" },
      })
    );
    expect(duplicateCodeRes.status).toBe(409);
    expect((await duplicateCodeRes.json()).error.code).toBe("PROJECT_CODE_EXISTS");

    // 2. Concurrent optimistic version updates: first succeeds, stale second returns 409
    const [patchOne, patchTwo] = await Promise.all([
      patchProjectHandler(
        jsonRequest(`/api/projects/${created.id}`, {
          method: "PATCH",
          cookie,
          body: { version: 1, title: "Stone Pavilion Rev A" },
        }),
        { params: Promise.resolve({ id: created.id }) }
      ),
      patchProjectHandler(
        jsonRequest(`/api/projects/${created.id}`, {
          method: "PATCH",
          cookie,
          body: { version: 1, title: "Stone Pavilion Rev B" },
        }),
        { params: Promise.resolve({ id: created.id }) }
      ),
    ]);

    const statuses = [patchOne.status, patchTwo.status].sort();
    expect(statuses).toEqual([200, 409]);

    // 3. Persistence across requests: GET returns updated version 2
    const getAfter = await getProjectHandler(
      jsonRequest(`/api/projects/${created.id}`, { cookie }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(getAfter.status).toBe(200);
    const fetched = (await getAfter.json()).project;
    expect(fetched.version).toBe(2);
    expect(["Stone Pavilion Rev A", "Stone Pavilion Rev B"]).toContain(fetched.title);
  });

  it("supports server-side search, filtering, pagination, and multi-org role switching", async () => {
    const ownerInfo = await seedMemberInOrg(bundle, {
      organizationId: "org_north",
      organizationName: "Atölye Kuzey",
      organizationSlug: "atolye-kuzey",
      email: "multi@studio.test",
      name: "Multi Studio Architect",
      password: "Password!2026",
      role: "owner",
    });

    await bundle.db.insert(organizations).values({
      id: "org_south",
      name: "Stüdyo Güney",
      slug: "studyo-guney",
      studioCode: "SG",
    });
    await bundle.db.insert(memberships).values({
      id: "mem_south_viewer",
      organizationId: "org_south",
      userId: ownerInfo.userId,
      role: "viewer",
    });

    const cookie = await loginAs("multi@studio.test", "Password!2026");

    // Create 3 projects in North as owner
    for (const [code, title, status, priority] of [
      ["AK-101", "Haliç Timber Pavilion", "active", "high"],
      ["AK-102", "Kadıköy Acoustic Hall", "planning", "medium"],
      ["AK-103", "Bozcaada Bridge", "active", "critical"],
    ] as const) {
      const res = await createProjectHandler(
        jsonRequest("/api/projects", {
          method: "POST",
          cookie,
          body: { code, title, clientName: "Civic Board", status, priority },
        })
      );
      expect(res.status).toBe(201);
    }

    // Search q=Timber + status=active
    const searchRes = await listProjectsHandler(
      jsonRequest("/api/projects?q=Timber&status=active&sort=code_asc&page=1&limit=10", { cookie })
    );
    expect(searchRes.status).toBe(200);
    const searchData = await searchRes.json();
    expect(searchData.items).toHaveLength(1);
    expect(searchData.items[0].code).toBe("AK-101");

    // Pagination limit=2
    const page1 = await listProjectsHandler(
      jsonRequest("/api/projects?sort=code_asc&page=1&limit=2", { cookie })
    );
    const page1Data = await page1.json();
    expect(page1Data.items).toHaveLength(2);
    expect(page1Data.pagination.total).toBe(3);
    expect(page1Data.pagination.totalPages).toBe(2);

    const page2 = await listProjectsHandler(
      jsonRequest("/api/projects?sort=code_asc&page=2&limit=2", { cookie })
    );
    const page2Data = await page2.json();
    expect(page2Data.items).toHaveLength(1);
    expect(page2Data.items[0].code).toBe("AK-103");

    // Switch to South where user has viewer role
    const switchRes = await switchOrgHandler(
      jsonRequest("/api/organizations/switch", {
        method: "POST",
        cookie,
        body: { targetOrganizationId: "org_south" },
      })
    );
    expect(switchRes.status).toBe(200);
    const switchData = await switchRes.json();
    expect(switchData.activeOrganization.id).toBe("org_south");
    expect(switchData.activeOrganization.role).toBe("viewer");

    // Cannot create project in South as viewer
    const blockedCreate = await createProjectHandler(
      jsonRequest("/api/projects", {
        method: "POST",
        cookie,
        body: { code: "SG-201", title: "Blocked Write", clientName: "Client" },
      })
    );
    expect(blockedCreate.status).toBe(403);
  });
});
