import { test, expect } from "@playwright/test";
test("real text editing, undo, save and reopening a persistent project", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Scene 1:", exact: false }),
  ).toBeVisible();
  const title = "E2E Studio " + Date.now();
  await page.getByLabel("Project title", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page
    .getByRole("button", {
      name: "MAKE IT MATTER. Kinetic statement",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Text content", { exact: true })
    .fill("CREATE WITH INTENTION.");
  await page.getByLabel("X position %", { exact: true }).fill("38");
  await page.getByLabel("Undo (Ctrl Z)", { exact: true }).click();
  await expect(page.getByLabel("X position %", { exact: true })).toHaveValue(
    "50",
  );
  await page.getByLabel("Redo (Ctrl Shift Z)", { exact: true }).click();
  await expect(page.getByLabel("X position %", { exact: true })).toHaveValue(
    "38",
  );
  await expect
    .poll(async () => {
      const p = await request.get("/api/projects");
      const list = await p.json();
      return list.find((x: { name: string }) => x.name === title)?.scenes[0]
        .layers[0]?.text;
    })
    .toBe("CREATE WITH INTENTION.");
  await page.reload();
  await expect(page.getByLabel("Project title", { exact: true })).toHaveValue(
    title,
  );
  await page
    .getByRole("button", { name: "Clip Kinetic statement", exact: true })
    .click();
  await expect(page.getByLabel("Text content", { exact: true })).toHaveValue(
    "CREATE WITH INTENTION.",
  );
  await page.screenshot({ path: "examples/output/studio-editor.png" });
  expect(errors).toEqual([]);
});
test("twelve templates, filtering, actual project creation, and timeline split", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Templates", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Use this template", exact: false }),
  ).toHaveCount(12);
  await page.getByRole("button", { name: "SaaS", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Use this template", exact: false }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Use this template", exact: false })
    .click();
  await expect(page.getByLabel("Project title", { exact: true })).toHaveValue(
    "Luxury SaaS Commercial",
  );
  await page.getByRole("button", { name: "Scene 1:", exact: false }).click();
  await page
    .getByRole("button", { name: "Split at playhead (S)", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /^Scene [1-4]:/ })).toHaveCount(
    4,
  );
});
test("disconnected Director reports real state and rejects malformed JSON", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "AI Director", exact: true }).click();
  await expect(
    page.getByText("No AI provider connected", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Generate project proposal",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  await page
    .getByLabel("Project JSON", { exact: true })
    .fill('{"schemaVersion":1,"execute":"bad"}');
  await page
    .getByRole("button", { name: "Validate & review", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("invalid");
});
test("exports a real PNG from the browser with actual progress and download", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("button", { name: "Current frame", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your film is ready.", exact: true }),
  ).toBeVisible({ timeout: 70000 });
  const download = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Download output", exact: true })
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.png$/);
  expect(await file.failure()).toBeNull();
});
test("mobile layout keeps core navigation and property editing available", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Ideas worth looking at. Editorial headline",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Show inspector", exact: true })
    .click();
  await expect(page.getByLabel("Text content", { exact: true })).toBeVisible();
  await page
    .getByLabel("Text content", { exact: true })
    .fill("A SMALL SCREEN.\nA BIG IDEA.");
  await page
    .getByRole("button", { name: "Collapse inspector", exact: true })
    .click();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.screenshot({ path: "examples/output/studio-mobile.png" });
  await expect(
    page.getByRole("button", { name: "Export", exact: true }),
  ).toBeVisible();
});

test("shift selection, actual waveform, and saving a reusable template", async ({
  page,
}) => {
  await page.goto("/");
  await page.screenshot({ path: "examples/output/studio-workspace.png" });
  await page
    .getByRole("button", {
      name: "Clip Cinematic Website Showcase",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Clip A closer look", exact: true })
    .click({ modifiers: ["Shift"] });
  await expect(page.locator(".timeline-clip.selected")).toHaveCount(2);
  await page
    .locator(".editor-panel-tabs")
    .getByRole("button", { name: "Assets", exact: true })
    .click();
  await page.getByPlaceholder("Find an asset…").fill("nova-original-score");
  const audio = page
    .locator(".asset-card")
    .filter({ hasText: "nova-original-score" })
    .first();
  await expect(audio).toBeVisible();
  await audio.click();
  await expect(page.getByLabel("Decoded audio waveform")).toBeVisible({
    timeout: 20000,
  });
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Templates", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save current as template", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Made by you. Ready for next time.",
      exact: true,
    }),
  ).toBeVisible();
});
