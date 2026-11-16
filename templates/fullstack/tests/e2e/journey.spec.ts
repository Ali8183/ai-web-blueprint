import fs from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const SCREENSHOTS_DIR = path.resolve(process.cwd(), "../../docs/screenshots");

test.describe("Atölye Pusula end-to-end studio ledger journey", () => {
  test("register, verify outbox email, create/search/edit project, keyboard focus trap, axe & responsive screenshots, logout", async ({
    page,
  }) => {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

    // 1. Landing page + axe accessibility + responsive screenshots
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Every commission, structural phase, and studio boundary"
    );

    const homeAxe = await new AxeBuilder({ page }).analyze();
    expect(homeAxe.violations).toEqual([]);

    for (const vp of [
      { width: 360, height: 800 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(vp);
      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(hasOverflow, `Horizontal overflow on / at ${vp.width}x${vp.height}`).toBe(false);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `home-${vp.width}x${vp.height}.png`),
        fullPage: true,
      });
    }

    await page.setViewportSize({ width: 1440, height: 900 });

    // 2. Register new studio + owner account
    const uniqueEmail = `e2e-${Date.now()}@atolyepusula.test`;
    await page.goto("/register");
    await page.getByLabel("Full name").fill("Defne Mimar");
    await page.getByLabel("Studio / workspace name").fill("Atölye Mimarlık");
    await page.getByLabel("Work email").fill(uniqueEmail);
    await page.getByLabel("Password (8+ characters)").fill("StudioJourney!2026");
    await page.getByRole("button", { name: "Create studio workspace" }).click();

    await page.waitForURL("**/app");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Atölye Mimarlık");
    await expect(page.getByText("Email verification pending")).toBeVisible();

    // 3. Inspect dev outbox & verify email
    const outboxRes = await page.request.get(
      `/api/dev/outbox?email=${encodeURIComponent(uniqueEmail)}`
    );
    expect(outboxRes.status()).toBe(200);
    const outboxData = (await outboxRes.json()) as {
      messages: Array<{ kind: string; token: string }>;
    };
    const verifyEmailMsg = outboxData.messages.find((m) => m.kind === "verify_email");
    expect(verifyEmailMsg).toBeDefined();

    await page.goto(`/verify-email?token=${encodeURIComponent(verifyEmailMsg!.token)}`);
    await expect(page.getByText("Email verified successfully.")).toBeVisible();
    await page.getByRole("link", { name: "Continue to studio ledger" }).click();
    await page.waitForURL("**/app");
    await expect(page.getByText("Email verification pending")).toHaveCount(0);

    // 4. Accessibility scan on authenticated ledger (wait for hydration first)
    await expect(page.getByRole("button", { name: "New project" })).toBeEnabled();
    await page.waitForLoadState("networkidle");
    const appAxe = await new AxeBuilder({ page }).analyze();
    expect(appAxe.violations).toEqual([]);

    // 5. Keyboard modal focus trap + Escape restore check
    const newProjectBtn = page.getByRole("button", { name: "New project" });
    await newProjectBtn.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    for (let i = 0; i < 14; i += 1) {
      await page.keyboard.press("Tab");
      const insideDialog = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]');
        return Boolean(dlg && dlg.contains(document.activeElement));
      });
      expect(insideDialog, "Tab escaped modal focus trap").toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    const focusRestored = await page.evaluate(
      () => document.activeElement?.textContent?.includes("New project") ?? false
    );
    expect(focusRestored).toBe(true);

    // 6. Create two projects for search/filter & edit checks
    const ledgerTable = page.getByRole("table");

    await newProjectBtn.click();
    await dialog.getByLabel("Project code").fill("AM-301");
    await dialog.getByLabel("Client", { exact: true }).fill("Kadıköy Maritime Trust");
    await dialog.getByLabel("Project title").fill("Bosphorus Timber Pier");
    await dialog.getByLabel("Discipline").selectOption("structural");
    await dialog.getByLabel("Status", { exact: true }).selectOption("active");
    await dialog.getByLabel("Priority", { exact: true }).selectOption("high");
    await dialog.getByLabel("Fee budget (USD)").fill("245000");
    await dialog
      .getByLabel("Scope notes")
      .fill("Timber-steel pier inspection and coastal pilings ledger.");
    await dialog.getByRole("button", { name: "Create project" }).click();

    await expect(page.getByText("Project AM-301 created.")).toBeVisible();
    await expect(ledgerTable.getByText("Bosphorus Timber Pier")).toBeVisible();

    await newProjectBtn.click();
    await dialog.getByLabel("Project code").fill("AM-302");
    await dialog.getByLabel("Client", { exact: true }).fill("Pera Cultural Board");
    await dialog.getByLabel("Project title").fill("Galata Acoustic Vault");
    await dialog.getByLabel("Status", { exact: true }).selectOption("planning");
    await dialog.getByRole("button", { name: "Create project" }).click();

    await expect(page.getByText("Project AM-302 created.")).toBeVisible();
    await expect(ledgerTable.getByText("Galata Acoustic Vault")).toBeVisible();

    // 7. Server-side search and status filter
    const searchInput = page.getByLabel("Search code, title, or client");
    const searchRespPromise = page.waitForResponse(
      (res) => res.url().includes("/api/projects") && res.url().includes("q=Timber")
    );
    await searchInput.fill("Timber");
    await searchRespPromise;

    await expect(ledgerTable.getByText("Bosphorus Timber Pier")).toBeVisible();
    await expect(ledgerTable.getByText("Galata Acoustic Vault")).toHaveCount(0);

    const clearSearchResp = page.waitForResponse(
      (res) => res.url().includes("/api/projects") && !res.url().includes("q=")
    );
    await searchInput.fill("");
    await clearSearchResp;

    const statusFilter = page.getByLabel("Status", { exact: true });
    const filterRespPromise = page.waitForResponse(
      (res) => res.url().includes("/api/projects") && res.url().includes("status=planning")
    );
    await statusFilter.selectOption("planning");
    await filterRespPromise;

    await expect(ledgerTable.getByText("Galata Acoustic Vault")).toBeVisible();
    await expect(ledgerTable.getByText("Bosphorus Timber Pier")).toHaveCount(0);

    const resetFilterResp = page.waitForResponse(
      (res) => res.url().includes("/api/projects") && !res.url().includes("status=")
    );
    await statusFilter.selectOption("");
    await resetFilterResp;

    // 8. Edit project and verify persistence across reload
    await page.getByRole("button", { name: "Edit AM-301" }).click();
    await dialog.getByLabel("Project title").fill("Bosphorus Timber Pier Phase II");
    await dialog.getByLabel("Status", { exact: true }).selectOption("review");
    await dialog.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Project AM-301 updated to v2.")).toBeVisible();
    await page.reload();
    await expect(ledgerTable.getByText("Bosphorus Timber Pier Phase II")).toBeVisible();

    // 9. Capture responsive screenshots of /app at 360x800, 768x1024, 1440x900
    for (const vp of [
      { width: 360, height: 800 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(vp);
      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(hasOverflow, `Horizontal overflow on /app at ${vp.width}x${vp.height}`).toBe(false);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `ledger-${vp.width}x${vp.height}.png`),
        fullPage: true,
      });
    }

    // 10. Logout and verify /app redirects back to /login
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("**/login");

    await page.goto("/app");
    await page.waitForURL("**/login");
  });
});
