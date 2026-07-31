import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { referenceCache } from "../src/common/reference-cache.js";

beforeEach(() => referenceCache.clear());

test("reference cache deduplicates in-flight loads and reuses warm values", async () => {
  let loads = 0;
  const loader = async () => {
    loads += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { value: loads };
  };
  const [first, second] = await Promise.all([
    referenceCache.getOrLoad("teachers", "school-a", "active", loader),
    referenceCache.getOrLoad("teachers", "school-a", "active", loader),
  ]);
  const warm = await referenceCache.getOrLoad(
    "teachers",
    "school-a",
    "active",
    loader,
  );
  assert.equal(loads, 1);
  assert.deepEqual(first, second);
  assert.deepEqual(warm, first);
});

test("reference cache invalidation is namespace and school scoped", async () => {
  let schoolALoads = 0;
  let schoolBLoads = 0;
  const loadA = async () => ({ version: ++schoolALoads });
  const loadB = async () => ({ version: ++schoolBLoads });
  await referenceCache.getOrLoad("teachers", "school-a", "all", loadA);
  await referenceCache.getOrLoad("teachers", "school-b", "all", loadB);
  referenceCache.invalidateSchool("teachers", "school-a");
  await referenceCache.getOrLoad("teachers", "school-a", "all", loadA);
  await referenceCache.getOrLoad("teachers", "school-b", "all", loadB);
  assert.equal(schoolALoads, 2);
  assert.equal(schoolBLoads, 1);
});

test("reference cache remains bounded", async () => {
  for (let index = 0; index < 250; index += 1) {
    await referenceCache.getOrLoad(
      "subjects",
      `school-${index}`,
      "all",
      async () => index,
    );
  }
  assert.equal(referenceCache.size(), 200);
});
