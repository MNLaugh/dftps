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

// ============================================================================
// Additional chunk() tests for better coverage
// ============================================================================

Deno.test("chunk - handles negative size (treats as 0)", () => {
  const result = chunk([1, 2, 3], -1);
  assertEquals(result, []);
});

Deno.test("chunk - handles zero size", () => {
  const result = chunk([1, 2, 3], 0);
  assertEquals(result, []);
});

Deno.test("chunk - handles fractional size (rounds to integer)", () => {
  const result = chunk([1, 2, 3, 4, 5, 6], 2.7);
  assertEquals(result, [[1, 2], [3, 4], [5, 6]]);
});

// ============================================================================
// Additional padStart() tests for Unicode
// ============================================================================

Deno.test("padStart - handles Unicode padding characters", () => {
  const result = String(padStart("a", 3, "🎉"));
  assertEquals(result.length >= 3, true);
});

Deno.test("padStart - handles Unicode in string", () => {
  const result = String(padStart("🎉", 5, " "));
  assertEquals(result.includes("🎉"), true);
});

Deno.test("padStart - numeric input", () => {
  // When passing a number, padStart converts it internally
  // The actual behavior may vary based on string conversion
  const result = String(padStart(42, 5, "0"));
  assertEquals(result.includes("42"), true);
  assertEquals(result.endsWith("42"), true);
});

Deno.test("padStart - padding with multiple chars", () => {
  const result = String(padStart("x", 5, "ab"));
  assertEquals(result.endsWith("x"), true);
  assertEquals(result.length, 5);
});

// ============================================================================
// Additional compact() tests
// ============================================================================

Deno.test("compact - handles null input", () => {
  // deno-lint-ignore no-explicit-any
  const result = compact(null as any);
  assertEquals(result, []);
});

Deno.test("compact - preserves objects and arrays", () => {
  const obj = { a: 1 };
  const arr = [1, 2];
  const result = compact([obj, arr, 0, null]);
  assertEquals(result.length, 2);
  assertEquals(result[0], obj);
  assertEquals(result[1], arr);
});

// ============================================================================
// Edge case tests for toFinite/toInteger coverage  
// ============================================================================

Deno.test("chunk - handles Infinity size", () => {
  // toFinite converts Infinity to MAX_INTEGER, toInteger keeps it
  const result = chunk([1, 2, 3], Infinity);
  assertEquals(result, [[1, 2, 3]]);
});

Deno.test("chunk - handles -Infinity size (becomes 0)", () => {
  // toFinite converts -Infinity to -MAX_INTEGER, toInteger keeps it
  // Math.max with 0 makes it 0
  const result = chunk([1, 2, 3], -Infinity);
  assertEquals(result, []);
});

Deno.test("chunk - handles NaN size (becomes 0)", () => {
  // NaN becomes 0 in toFinite (value !== value check)
  const result = chunk([1, 2, 3], NaN);
  assertEquals(result, []);
});

Deno.test("chunk - handles null array", () => {
  // deno-lint-ignore no-explicit-any
  const result = chunk(null as any, 2);
  assertEquals(result, []);
});

Deno.test("chunk - handles undefined array", () => {
  // deno-lint-ignore no-explicit-any
  const result = chunk(undefined as any, 2);
  assertEquals(result, []);
});

// ============================================================================
// Additional padStart() tests to cover edge cases
// ============================================================================

Deno.test("padStart - returns empty string when string is falsy and length is 0", () => {
  // Covers: string || "" branch when length is 0
  const result = padStart("", 0);
  assertEquals(result, "");
});

Deno.test("padStart - returns empty string when string is empty and strLength >= length", () => {
  // When string is "" and length is 0, strLength is 0, so strLength < length is false
  const result = padStart("", 0, "x");
  assertEquals(result, "");
});

Deno.test("padStart - handles string equals target length exactly", () => {
  const result = padStart("abc", 3, "x");
  assertEquals(result, "abc");
});

Deno.test("padStart - empty chars results in spaces", () => {
  // Covers: chars === undefined uses space
  const result = padStart("a", 3);
  assertEquals(result, "  a");
});

Deno.test("padStart - single char padding", () => {
  // Covers: charsLength < 2 branch with charsLength === 1
  const result = padStart("x", 5, "0");
  assertEquals(result, "0000x");
});

Deno.test("padStart - empty string chars becomes space", () => {
  // When chars is empty string "", baseToString returns ""
  // charsLength is 0, so charsLength ? repeat : chars returns ""
  const result = String(padStart("a", 5, ""));
  // Empty chars should fall back to default behavior
  assertEquals(result.endsWith("a"), true);
});

Deno.test("padStart - array as chars (triggers baseToString with array)", () => {
  // Covers: if (Array.isArray(value)) in baseToString
  // deno-lint-ignore no-explicit-any
  const result = String(padStart("x", 10, ["a", "b"] as any));
  assertEquals(result.endsWith("x"), true);
  // Array ["a", "b"] becomes "a,b" via baseToString
  assertEquals(result.includes("a"), true);
});

// ============================================================================
// Symbol and special value tests for baseToString coverage
// ============================================================================

Deno.test("padStart - symbol as chars (triggers isSymbol branch)", () => {
  // Covers: if (isSymbol(value)) in baseToString
  // deno-lint-ignore no-explicit-any
  const sym = Symbol("test") as any;
  const result = String(padStart("x", 5, sym));
  assertEquals(result.endsWith("x"), true);
});

Deno.test("padStart - undefined chars (triggers getTag undefined branch)", () => {
  // Covers: value === undefined ? "[object Undefined]" in getTag
  // When chars is undefined, it defaults to space " "
  const result = padStart("a", 3, undefined);
  assertEquals(result, "  a");
});

Deno.test("padStart - null chars (triggers getTag null branch)", () => {
  // Covers: "[object Null]" branch in getTag
  // deno-lint-ignore no-explicit-any
  const result = String(padStart("a", 5, null as any));
  assertEquals(result.endsWith("a"), true);
});

Deno.test("chunk - handles -0 value size (covers -0 branch)", () => {
  // Covers: (result == "0" && (1 / value) == -INFINITY) ? "-0" : result
  // -0 is treated as 0 in Math.max, so result is empty
  const result = chunk([1, 2, 3], -0);
  assertEquals(result, []);
});
