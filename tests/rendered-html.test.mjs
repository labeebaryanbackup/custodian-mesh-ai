import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server renders the complete CustodianMesh dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  const visibleHtml = html.replaceAll("<!-- -->", "");
  assert.match(html, /<title>CustodianMesh AI/);
  assert.match(html, /Ask across agencies/);
  assert.match(html, /Keep custody local/);
  assert.match(visibleHtml, /30\/30 cases passed/);
  assert.match(html, /Run governed query/);
  assert.match(html, /Caller-selected for testing; not authenticated identity/);
  assert.match(html, /id="main-content"/);
  assert.match(html, /aria-live="polite"/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
  assert.doesNotMatch(html, /CANARY-|farmerAlias|meterId|nestLat/);
});

test("social card is a project UI capture without generative provenance", async () => {
  const socialCard = await readFile(
    new URL("../public/custodian-mesh-social.png", import.meta.url),
  );
  assert.deepEqual([...socialCard.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(socialCard.readUInt32BE(16), 1200);
  assert.equal(socialCard.readUInt32BE(20), 630);
  assert.doesNotMatch(socialCard.toString("latin1"), /c2pa|trainedAlgorithmicMedia|OpenAI/i);
});
