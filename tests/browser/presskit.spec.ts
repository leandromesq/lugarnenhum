import { expect, test } from "@playwright/test";
import { members } from "../../src/data/band";

const headings = [
  "RELEASE",
  "TRAJETÓRIA",
  "PRÓXIMO LANÇAMENTO",
  "INTEGRANTES",
  "FOTOS",
  "LOGOS",
];

test("Presskit shows the long-form material in order", async ({ page }) => {
  await page.goto("/presskit/");
  await expect(page.locator(".press h1")).toHaveText("PRESSKIT");
  await expect(page.locator(".press h2")).toHaveText(headings);
  for (const member of members) {
    await expect(
      page.getByRole("link", {
        name: `Instagram de ${member.name} (abre em nova aba)`,
      }),
    ).toHaveAttribute("href", `https://www.instagram.com/${member.instagram}/`);
  }
});

test("Presskit downloads are real files", async ({ page }) => {
  await page.goto("/presskit/");
  const links = page.locator(".press a[download]");
  await expect(links).toHaveCount(6);
  const hrefs = await links.evaluateAll((elements) =>
    elements.map((element) => (element as HTMLAnchorElement).href),
  );
  for (const href of hrefs) {
    const response = await page.request.get(href);
    expect(response.status(), href).toBe(200);
  }
});

test("Presskit does not scroll horizontally", async ({ page }) => {
  await page.goto("/presskit/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Desktop navigation clears the presskit text", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop layout only");
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/presskit/");
  const navigation = await page.locator(".site-navigation").boundingBox();
  const text = await page.locator(".press p").first().boundingBox();
  expect(navigation).not.toBeNull();
  expect(text).not.toBeNull();
  if (navigation && text) {
    expect(navigation.x).toBeGreaterThanOrEqual(text.x + text.width);
  }
});
