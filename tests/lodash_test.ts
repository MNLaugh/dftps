/**
 * Tests for lodash utility functions
 */
import { assertEquals } from "@std/assert";
import { chunk, compact, padStart } from "../src/_utils/lodash.ts";

// ============================================================================
// chunk() tests
// ============================================================================

Deno.test("chunk - splits array into chunks of given size", () => {
  const result = chunk([1, 2, 3, 4, 5], 2);
  assertEquals(result, [[1, 2], [3, 4], [5]]);
});

Deno.test("chunk - uses size 1 by default", () => {
  const result = chunk([1, 2, 3]);
  assertEquals(result, [[1], [2], [3]]);
});

Deno.test("chunk - returns empty array for empty input", () => {
  const result = chunk([], 2);
  assertEquals(result, []);
});

Deno.test("chunk - handles size larger than array", () => {
  const result = chunk([1, 2], 5);
  assertEquals(result, [[1, 2]]);
});

Deno.test("chunk - handles size equal to array length", () => {
  const result = chunk([1, 2, 3], 3);
  assertEquals(result, [[1, 2, 3]]);
});

Deno.test("chunk - handles strings in array", () => {
  const result = chunk(["a", "b", "c", "d"], 2);
  assertEquals(result, [["a", "b"], ["c", "d"]]);
});

// ============================================================================
// compact() tests
// ============================================================================

Deno.test("compact - removes falsy values", () => {
  const result = compact([0, 1, false, 2, "", 3, null, undefined, NaN]);
  assertEquals(result, [1, 2, 3]);
});

Deno.test("compact - returns empty array for all falsy", () => {
  const result = compact([0, false, "", null, undefined]);
  assertEquals(result, []);
});

Deno.test("compact - keeps truthy values", () => {
  const result = compact([1, "hello", true, {}, []]);
  assertEquals(result.length, 5);
});

Deno.test("compact - handles empty array", () => {
  const result = compact([]);
  assertEquals(result, []);
});

// ============================================================================
// padStart() tests
// ============================================================================

Deno.test("padStart - pads string to target length", () => {
  const result = padStart("5", 2, "0");
  assertEquals(result, "05");
});

Deno.test("padStart - pads with spaces by default", () => {
  const result = padStart("abc", 6);
  assertEquals(result, "   abc");
});

Deno.test("padStart - does not pad if already long enough", () => {
  const result = padStart("hello", 3, "0");
  assertEquals(result, "hello");
});

Deno.test("padStart - handles number converted to string", () => {
  // Note: padStart with number adds extra padding due to string conversion
  const result = padStart(String(7), 3, "0");
  assertEquals(result, "007");
});

Deno.test("padStart - pads with repeated chars", () => {
  const result = padStart("1", 5, "0");
  assertEquals(result, "00001");
});

Deno.test("padStart - handles empty string", () => {
  const result = padStart("", 3, "x");
  assertEquals(result, "xxx");
});
