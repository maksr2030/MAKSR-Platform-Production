import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const pages = ["index.html", "opportunities/index.html", "opportunities/preview/index.html"];

test("design preview pages preserve bilingual and preview-only safeguards", async () => {
  for (const path of pages) {
    const html = await read(path);
    assert.match(html, /<meta name="viewport"/i, path + " must define responsive viewport");
    assert.match(html, /name="robots" content="noindex,nofollow"/i, path + " must remain excluded from indexing during preview");
    assert.match(html, /data-en=/, path + " must include English localization markers");
    assert.match(html, /data-ar=/, path + " must include Arabic localization markers");
    assert.match(html, /design-v2\.css/, path + " must use the shared design system");
    assert.match(html, /design-v2\.js/, path + " must use the shared interaction layer");
  }
});

test("human-crafted design system avoids decorative AI visual tropes", async () => {
  const css = await read("assets/design-v2.css");
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|conic-gradient/i, "gradients are intentionally excluded");
  assert.doesNotMatch(css, /text-shadow\s*:/i, "glowing text is intentionally excluded");
  assert.match(css, /prefers-reduced-motion/, "reduced motion support is required");
  assert.match(css, /:focus-visible/, "visible keyboard focus is required");
  assert.match(css, /overflow:auto/, "wide functional elements must scroll inside their own containers");
});

test("preview content does not fabricate transaction proof", async () => {
  const combined = (await Promise.all(pages.map(read))).join("\n");
  const forbiddenClaims = [
    /success rate/i,
    /transactions completed/i,
    /investors onboarded/i,
    /deal volume/i,
    /trusted by/i
  ];
  for (const pattern of forbiddenClaims) assert.doesNotMatch(combined, pattern);
  assert.match(combined, /fabricat|اختلاق/i);
});

test("opportunity evaluation labels illustrative values explicitly", async () => {
  const detail = await read("opportunities/preview/index.html");
  assert.match(detail, /Illustrative/);
  assert.match(detail, /Design preview only/);
  assert.match(detail, /contains no live listing, valuation, ownership or transaction data/i);
});

test("product architecture keeps production safety rule explicit", async () => {
  const architecture = await read("docs/design-v2/PRODUCT-ARCHITECTURE.md");
  assert.match(architecture, /Preview only/i);
  assert.match(architecture, /Do not merge to main/i);
  assert.match(architecture, /explicit owner approval/i);
  for (const area of ["Public MAKSR","MAKSR Exchange","MAKSR Deal Workspace","MAKSR Sovereign Administration"]) {
    assert.equal(architecture.includes(area), true, area + " must remain defined");
  }
});
