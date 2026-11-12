import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { releases } from "../../src/data/band";

const stage = ".disc-stage";
const fallback = ".disc-fallback";
const counter = ".carousel-count";
const heading = ".release-details__copy h2";

const countOf = (index: number) =>
  `${String(index + 1).padStart(2, "0")} / ${String(releases.length).padStart(2, "0")}`;

/** Stage box, the disc diameter in CSS pixels and the viewport size. */
async function geometry(page: Page) {
  return page.evaluate(
    ({ stageSelector, fallbackSelector }) => {
      const stageElement = document.querySelector(stageSelector)!;
      const fallbackElement = document.querySelector(fallbackSelector)!;
      const box = stageElement.getBoundingClientRect();
      const disc = fallbackElement.getBoundingClientRect();
      return {
        stage: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        },
        disc: { width: disc.width, centreX: disc.x + disc.width / 2 },
        viewport: { width: innerWidth, height: innerHeight },
        scrollWidth: document.documentElement.scrollWidth,
      };
    },
    { stageSelector: stage, fallbackSelector: fallback },
  );
}

test("The selection stays centred with no horizontal overflow", async ({
  page,
}) => {
  await page.goto("/musica/");
  await expect(page.locator(stage)).toHaveAttribute("data-state", "ready", {
    timeout: 15000,
  });
  const { stage: box, disc, viewport, scrollWidth } = await geometry(page);
  const centre = box.x + box.width / 2;
  // The stack fans out to the left, so the selection has to sit on the centre
  // line for the copy and controls below to line up.
  expect(Math.abs(centre - viewport.width / 2)).toBeLessThanOrEqual(2);
  expect(Math.abs(disc.centreX - centre)).toBeLessThanOrEqual(1);
  expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
  expect(box.width).toBeLessThanOrEqual(viewport.width);
  // Wide enough to reach the first stacked disc, or the whole viewport on
  // phones, where the disc itself is wider than half the screen.
  expect(box.width / 2).toBeGreaterThanOrEqual(
    Math.min(disc.width, viewport.width / 2) - 1,
  );
});

test("Clicking the first stacked disc selects the next release", async ({
  page,
}) => {
  await page.goto("/musica/");
  await expect(page.locator(stage)).toHaveAttribute("data-state", "ready", {
    timeout: 15000,
  });
  await expect(page.locator(heading)).toHaveText(releases[0].title);
  const { stage: box, disc, viewport } = await geometry(page);
  const centre = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  // One disc to the left of the selection is the next release; clamp into
  // the viewport for narrow phones, where that centre is already offscreen.
  const x = Math.min(viewport.width - 2, Math.max(2, centre - disc.width));
  await page.mouse.click(x, y);
  await expect(page.locator(heading)).toHaveText(releases[1].title);
  await expect(page.locator(counter)).toHaveText(countOf(1));
  await page.mouse.click(centre, y);
  await expect(page.locator(".preview-button")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("The empty side of the stage still steps one release", async ({
  page,
}) => {
  await page.goto("/musica/");
  await expect(page.locator(stage)).toHaveAttribute("data-state", "ready", {
    timeout: 15000,
  });
  const { stage: box, disc } = await geometry(page);
  const centre = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.click(centre + disc.width * 0.6, y);
  await expect(page.locator(counter)).toHaveText(countOf(1));
});

test("Swipes and horizontal wheels still walk the releases", async ({
  page,
}, testInfo) => {
  await page.goto("/musica/");
  await expect(page.locator(stage)).toHaveAttribute("data-state", "ready", {
    timeout: 15000,
  });
  const { stage: box } = await geometry(page);
  const centre = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(centre, y);
  await page.mouse.down();
  await page.mouse.move(centre - 90, y, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator(counter)).toHaveText(countOf(1));
  if (testInfo.project.name !== "desktop") return;
  await page.mouse.move(centre, y);
  await page.mouse.wheel(70, 0);
  await expect(page.locator(counter)).toHaveText(countOf(2));
});
