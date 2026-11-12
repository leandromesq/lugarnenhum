import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { members } from "../../src/data/band";
import type { Member } from "../../src/data/band";

function label(member: Member) {
  return `${member.name}, ${member.role}`;
}

function role(member: Member) {
  return member.role.charAt(0).toUpperCase() + member.role.slice(1);
}

function hotspot(page: Page, member: Member) {
  return page.getByRole("button", { name: label(member), exact: true });
}

test("Member markers appear on hover or keyboard focus and stay visible on touch", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const markers = page.locator(".member-hotspot__marker");
  const touch = testInfo.project.name === "mobile";
  for (const marker of await markers.all()) {
    await expect(marker).toHaveCSS("opacity", touch ? "1" : "0");
  }
  if (touch) return;

  for (const member of members) {
    const button = hotspot(page, member);
    const marker = button.locator(".member-hotspot__marker");
    await button.hover();
    await expect(marker).toHaveCSS("opacity", "1");
    for (const other of members.filter((entry) => entry !== member)) {
      await expect(
        hotspot(page, other).locator(".member-hotspot__marker"),
      ).toHaveCSS("opacity", "0");
    }
    await page.mouse.move(8, 60);
    await expect(marker).toHaveCSS("opacity", "0");
  }

  await page.keyboard.press("Tab");
  const button = hotspot(page, members[0]);
  await button.focus();
  await expect(button.locator(".member-hotspot__marker")).toHaveCSS(
    "opacity",
    "1",
  );
});

async function viewport(page: Page) {
  return page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
}

/** Hotspots are laid out in the photograph, not in data order. */
async function orderFromLeftToRight(page: Page) {
  return page.locator(".member-hotspot").evaluateAll((nodes) =>
    nodes
      .map((node) => ({
        label: node.getAttribute("aria-label"),
        left: node.getBoundingClientRect().left,
      }))
      .sort((first, second) => first.left - second.left)
      .map((entry) => entry.label),
  );
}

test("Member hotspots sit on the photograph and are reachable by name", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".member-layer")).toBeVisible();
  const size = await viewport(page);
  for (const member of members) {
    const button = hotspot(page, member);
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    if (!box) continue;
    // The cover projection crops and bleeds the photograph, so the full box can
    // cross an edge while the marker above the head stays visible.
    const visibleLeft = Math.max(box.x, 0);
    const visibleRight = Math.min(box.x + box.width, size.width);
    expect(visibleRight - visibleLeft).toBeGreaterThan(box.width * 0.5);
    expect(box.y).toBeLessThan(size.height);
    expect(box.y + box.height).toBeGreaterThan(size.height * 0.5);
    const marker = await button
      .locator(".member-hotspot__marker")
      .boundingBox();
    expect(marker).not.toBeNull();
    if (!marker) continue;
    expect(marker.y).toBeGreaterThanOrEqual(0);
    expect(marker.y + marker.height).toBeLessThanOrEqual(size.height);
    expect(marker.x).toBeGreaterThanOrEqual(0);
    expect(marker.x + marker.width).toBeLessThanOrEqual(size.width);
  }
});

test("Hotspots follow the members' standing order in the photograph", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator(".member-layer")).toBeVisible();
  const expected =
    testInfo.project.name === "mobile" ? [1, 0, 2, 3] : [0, 1, 2, 3];
  expect(await orderFromLeftToRight(page)).toEqual(
    expected.map((index) => label(members[index])),
  );
  if (testInfo.project.name === "mobile") return;
  const leandro = hotspot(page, members[0]);
  const box = await leandro.boundingBox();
  const size = await viewport(page);
  expect(box).not.toBeNull();
  if (!box) return;
  const center = box.x + box.width / 2;
  expect(center).toBeGreaterThan(size.width * 0.2);
  expect(center).toBeLessThan(size.width * 0.36);
});

test("Each member window shows the name, capitalised role and Instagram link", async ({
  page,
}) => {
  await page.goto("/");
  const size = await viewport(page);
  for (const member of members) {
    const button = hotspot(page, member);
    await button.click();
    const dialog = page.getByRole("dialog", { name: member.name, exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(member.name);
    await expect(dialog.locator(".member-window__role")).toHaveText(
      role(member),
    );
    const link = dialog.getByRole("link", {
      name: `Instagram de ${member.name} (abre em nova aba)`,
      exact: true,
    });
    await expect(link).toHaveAttribute(
      "href",
      `https://www.instagram.com/${member.instagram}/`,
    );
    await expect(link).toHaveAttribute("target", "_blank");
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    if (!box) continue;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  }
});

test("Opening another member closes the previous window", async ({ page }) => {
  await page.goto("/");
  hotspot(page, members[0]).click();
  const first = page.getByRole("dialog", { name: members[0].name });
  await expect(first).toBeVisible();
  hotspot(page, members[1]).click();
  await expect(first).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: members[1].name }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
});

test("Escape and the close button close and restore focus to the hotspot", async ({
  page,
}) => {
  await page.goto("/");
  const button = hotspot(page, members[0]);
  const dialog = page.getByRole("dialog", { name: members[0].name });
  await button.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(button).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: `Fechar janela de ${members[0].name}` })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(button).toBeFocused();
});

test("A focused hotspot opens its window with Enter", async ({ page }) => {
  await page.goto("/");
  const button = hotspot(page, members[2]);
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: members[2].name }),
  ).toBeVisible();
  await expect(button).toHaveAttribute("aria-expanded", "true");
});

test("A pointer press elsewhere on the page closes the open window", async ({
  page,
}) => {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: members[0].name });
  hotspot(page, members[0]).click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(8, 60);
  await expect(dialog).toHaveCount(0);
});

test("Hovering a hotspot keeps the home page interactive", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop pointer effect.");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("canvas.home-ascii")).toHaveAttribute(
    "data-ready",
    "true",
  );
  for (const member of members) {
    const box = await hotspot(page, member).boundingBox();
    if (!box) continue;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
  }
  expect(errors).toEqual([]);
  await expect(page.locator("canvas.home-ascii")).toHaveAttribute(
    "data-ready",
    "true",
  );
  hotspot(page, members[0]).click();
  await expect(
    page.getByRole("dialog", { name: members[0].name }),
  ).toBeVisible();
});

test("Mobile navigation stays clickable below an open window", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "The window overlaps mobile.");
  await page.goto("/");
  hotspot(page, members[0]).click();
  const dialog = page.getByRole("dialog", { name: members[0].name });
  await expect(dialog).toBeVisible();
  const navigation = page.getByRole("navigation", {
    name: "Navegação principal",
  });
  await expect(navigation).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  const navigationBox = await navigation.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  if (!dialogBox || !navigationBox) return;
  expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(navigationBox.y);
  const link = page.getByRole("link", { name: /^(NOSSA )?LOJA$/ });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/loja\/$/);
});
