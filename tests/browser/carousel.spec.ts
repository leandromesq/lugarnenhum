import { expect, test } from "@playwright/test";
import { releases } from "../../src/data/band";

const track = ".disc-track";
const active = '.disc[aria-pressed="true"]';
const name = (index: number) => `Selecionar ${releases[index].title}`;
const loop = [...releases.slice(1), releases[0]];

test("The entire CD track slides left with the selected disc centered", async ({
  page,
}) => {
  await page.goto("/musica/");
  const startSlot = Number(
    await page.locator(active).getAttribute("data-slot"),
  );
  const sample = () =>
    page.evaluate(
      (slots) =>
        slots.map((slot) => {
          const rect = document
            .querySelector(`[data-slot="${slot}"]`)!
            .getBoundingClientRect();
          return rect.x + rect.width / 2;
        }),
      [startSlot, startSlot + 1],
    );
  const before = await sample();
  await page.getByRole("button", { name: "Próximo lançamento" }).click();
  await expect(page.locator(track)).toHaveAttribute("data-moving", "true");
  await expect(page.locator(active)).toHaveAccessibleName(name(1));
  // Selection updates before the first CSS animation frame is painted.
  await expect
    .poll(async () => (await sample())[0])
    .toBeLessThan(before[0] - 1);
  const during = await sample();
  expect(
    Math.abs(during[0] - before[0] - (during[1] - before[1])),
  ).toBeLessThan(1);
  await expect(page.locator(track)).toHaveAttribute("data-moving", "false");
  await expect(page.locator(active)).toHaveCount(1);
  await expect(page.getByRole("button", { name: /^Selecionar / })).toHaveCount(
    3,
  );
  const centers = await page.evaluate(
    (names) => {
      const center = (name: string) => {
        const button = [
          ...document.querySelectorAll<HTMLButtonElement>(".disc"),
        ].find(
          (disc) =>
            disc.getAttribute("aria-label") === name &&
            disc.getAttribute("aria-hidden") !== "true",
        )!;
        const rect = button.getBoundingClientRect();
        return rect.x + rect.width / 2;
      };
      return {
        previous: center(names[0]),
        active: center(names[1]),
        next: center(names[2]),
        width: innerWidth,
      };
    },
    [name(0), name(1), name(2)],
  );
  expect(centers.previous).toBeLessThan(centers.active);
  expect(centers.next).toBeGreaterThan(centers.active);
  expect(Math.abs(centers.active - centers.width / 2)).toBeLessThan(1);
});

test("All six titles and durations appear in order and wrap continuously", async ({
  page,
}) => {
  await page.goto("/musica/");
  for (const release of [...loop, releases[1]]) {
    await page.getByRole("button", { name: "Próximo lançamento" }).click();
    await expect(page.locator(active)).toHaveAccessibleName(
      `Selecionar ${release.title}`,
    );
    await expect(page.locator(`${active} .disc__format`)).toHaveText(
      release.duration,
    );
    await expect(page.locator(".release-details__copy h2")).toHaveText(
      release.title,
    );
    await expect(page.locator(".release-details__copy p")).toContainText(
      release.duration,
    );
    await expect(page.locator(track)).toHaveAttribute("data-moving", "false");
  }
  await page.getByRole("button", { name: "Lançamento anterior" }).click();
  await expect(page.locator(active)).toHaveAccessibleName(name(0));
  await expect(page.locator(track)).toHaveAttribute("data-moving", "false");
  await page.getByRole("button", { name: "Lançamento anterior" }).click();
  await expect(page.locator(active)).toHaveAccessibleName(
    name(releases.length - 1),
  );
  await expect(page.locator(track)).toHaveAttribute("data-moving", "false");
  await expect(
    page.getByRole("button", { name: name(0), exact: true }),
  ).toHaveCount(1);
  await expect(page.locator(".carousel-count")).toHaveText("06 / 06");
});

test("CDs never cover the arrow buttons, including short screens", async ({
  page,
}, testInfo) => {
  const viewports =
    testInfo.project.name === "mobile"
      ? [
          { width: 320, height: 568 },
          { width: 390, height: 844 },
        ]
      : [
          { width: 1920, height: 1080 },
          { width: 1024, height: 768 },
          { width: 1024, height: 600 },
        ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/musica/");
    const stage = await page.locator(".disc-stage").boundingBox();
    for (const arrow of await page.locator(".carousel-controls button").all()) {
      await arrow.scrollIntoViewIfNeeded();
      const rect = await arrow.boundingBox();
      expect(stage!.y + stage!.height).toBeLessThanOrEqual(rect!.y);
      expect(
        await arrow.evaluate((button) => {
          const rect = button.getBoundingClientRect();
          return button.contains(
            document.elementFromPoint(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
            ),
          );
        }),
      ).toBe(true);
    }
    await page.getByRole("button", { name: "Próximo lançamento" }).click();
    await expect(page.locator(active)).toHaveAccessibleName(name(1));
  }
});

test("The selected CD overlaps and always paints above its neighbours", async ({
  page,
}) => {
  await page.goto("/musica/");
  const layering = await page.evaluate(() => {
    const selected = document.querySelector<HTMLButtonElement>(
      '.disc[aria-pressed="true"]',
    )!;
    const cursor = Number(selected.dataset.slot);
    const rect = selected.getBoundingClientRect();
    return [-1, 1].map((direction) => {
      const neighbour = document.querySelector<HTMLButtonElement>(
        `[data-slot="${cursor + direction}"]`,
      )!;
      const side = neighbour.getBoundingClientRect();
      const left = Math.max(rect.left, side.left);
      const right = Math.min(rect.right, side.right);
      return {
        overlap: right - left,
        selectedOnTop: selected.contains(
          document.elementFromPoint(
            (left + right) / 2,
            rect.y + rect.height / 2,
          ),
        ),
        selectedLayer: Number(getComputedStyle(selected.parentElement!).zIndex),
        sideLayer: Number(getComputedStyle(neighbour.parentElement!).zIndex),
      };
    });
  });
  for (const side of layering) {
    expect(side.overlap).toBeGreaterThan(20);
    expect(side.selectedOnTop).toBe(true);
    expect(side.selectedLayer).toBeGreaterThan(side.sideLayer);
  }
});

test("Rapid inputs preserve selection; desktop horizontal scrolling advances it", async ({
  page,
}, testInfo) => {
  await page.goto("/musica/");
  const next = page.getByRole("button", { name: "Próximo lançamento" });
  for (let i = 0; i < 4; i++) await next.click();
  await expect(page.locator(active)).toHaveAccessibleName(name(4));
  await expect(page.locator(track)).toHaveAttribute("data-moving", "false");
  if (testInfo.project.name === "mobile") return;
  const stage = await page.locator(".disc-stage").boundingBox();
  await page.mouse.move(
    stage!.x + stage!.width / 2,
    stage!.y + stage!.height / 2,
  );
  await page.mouse.wheel(130, 0);
  await expect(page.locator(active)).toHaveAccessibleName(name(5));
  await expect(page.locator(track)).toHaveAttribute("data-moving", "false");
});

test("Enabling reduced motion during a transition never locks navigation", async ({
  page,
}) => {
  await page.goto("/musica/");
  await page.getByRole("button", { name: "Próximo lançamento" }).click();
  await expect(page.locator(track)).toHaveAttribute("data-moving", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(track)).toHaveAttribute("data-moving", "false");
  await page.getByRole("button", { name: "Próximo lançamento" }).click();
  await expect(page.locator(active)).toHaveAccessibleName(name(2));
});

test("Reduced motion still allows continuous navigation without animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/musica/");
  for (const release of loop) {
    await page.getByRole("button", { name: "Próximo lançamento" }).click();
    await expect(page.locator(active)).toHaveAccessibleName(
      `Selecionar ${release.title}`,
    );
    await expect(page.locator(track)).toHaveAttribute("data-moving", "false");
  }
});
