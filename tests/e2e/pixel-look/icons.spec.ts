import { expect, test, type Locator, type Page } from '@playwright/test';
import fr from '../../../messages/fr.json';
import { sameColor, themeColors, type Rgb } from '../support/contrast';
import { enterAsGuest, uniqueName } from '../support/guests';

const tokenColors = [...themeColors().values()];

// Decoded in the page because Node has no PNG decoder here; drawing the PNG 1:1 on a canvas keeps every pixel value.
async function decodedColors(page: Page, png: Buffer): Promise<Rgb[]> {
  const colors = await page.evaluate(async (base64) => {
    const image = Object.assign(new Image(), { src: `data:image/png;base64,${base64}` });
    await image.decode();
    const context = Object.assign(document.createElement('canvas'), { width: image.naturalWidth, height: image.naturalHeight }).getContext('2d', { willReadFrequently: true })!;
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, image.naturalWidth, image.naturalHeight).data;
    const unique = new Set<string>();
    for (let index = 0; index < data.length; index += 4) unique.add(`${data[index]},${data[index + 1]},${data[index + 2]}`);
    return [...unique];
  }, png.toString('base64'));
  return colors.map((color) => color.split(',').map(Number) as unknown as Rgb);
}

// Cropped 1px inside the icon box, so neighbouring pixels never enter the sample.
async function screenshotColors(page: Page, icon: Locator): Promise<Rgb[]> {
  const box = (await icon.boundingBox())!;
  return decodedColors(page, await page.screenshot({ clip: { x: box.x + 1, y: box.y + 1, width: box.width - 2, height: box.height - 2 } }));
}

function blendedPixels(colors: Rgb[]): Rgb[] {
  return colors.filter((color) => !tokenColors.some((token) => sameColor(color, token)));
}

function headerIcons(page: Page): Locator[] {
  const banner = page.getByRole('banner');
  return [banner.getByRole('link', { name: fr.Header.wordmark }).locator('svg'), banner.getByRole('link', { name: fr.Header.tabs.race, exact: true }).locator('svg')];
}

for (const deviceScaleFactor of [1, 2]) {
  test.describe(`pixel icons at device scale ${deviceScaleFactor}`, () => {
    test.use({ deviceScaleFactor });

    test('the wordmark ball and the race tab icon use only palette colors, never a blurred edge', async ({ page }) => {
      await enterAsGuest(page, uniqueName('Net '));
      for (const icon of headerIcons(page)) expect(blendedPixels(await screenshotColors(page, icon))).toEqual([]);
    });
  });
}

test('every pixel icon is drawn with crisp edges at 24 or 48 pixels, and every image is pixelated', async ({ page }) => {
  await enterAsGuest(page, uniqueName('Net '));
  const icons = await page.locator('svg.pixel-icon').evaluateAll((svgs) =>
    svgs.map((svg) => ({ shapeRendering: svg.getAttribute('shape-rendering'), width: svg.getBoundingClientRect().width })),
  );
  expect(icons.length).toBeGreaterThan(0);
  for (const icon of icons) {
    expect(icon.shapeRendering).toBe('crispEdges');
    expect([24, 48]).toContain(icon.width);
  }
  const blurryImages = await page.locator('img').evaluateAll((images) => images.filter((image) => getComputedStyle(image).imageRendering !== 'pixelated').length);
  expect(blurryImages).toBe(0);
});
