const INFINITY = 1 / 0;

const rsAstralRange = "\\ud800-\\udfff";
const rsComboMarksRange = "\\u0300-\\u036f";
const reComboHalfMarksRange = "\\ufe20-\\ufe2f";
const rsComboSymbolsRange = "\\u20d0-\\u20ff";
const rsComboMarksExtendedRange = "\\u1ab0-\\u1aff";
const rsComboMarksSupplementRange = "\\u1dc0-\\u1dff";
const rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange + rsComboMarksExtendedRange +
  rsComboMarksSupplementRange;
const rsVarRange = "\\ufe0e\\ufe0f";

/** Used to compose unicode capture groups. */
const rsZWJ = "\\u200d";

/** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
const reHasUnicode = RegExp(`[${rsZWJ + rsAstralRange + rsComboRange + rsVarRange}]`);

/** Used to compose unicode capture groups. */
const rsAstral = `[${rsAstralRange}]`;
const rsCombo = `[${rsComboRange}]`;
const rsFitz = "\\ud83c[\\udffb-\\udfff]";
const rsModifier = `(?:${rsCombo}|${rsFitz})`;
const rsNonAstral = `[^${rsAstralRange}]`;
const rsRegional = "(?:\\ud83c[\\udde6-\\uddff]){2}";
const rsSurrPair = "[\\ud800-\\udbff][\\udc00-\\udfff]";

/** Used to compose unicode regexes. */
const reOptMod = `${rsModifier}?`;
const rsOptVar = `[${rsVarRange}]?`;
const rsOptJoin = `(?:${rsZWJ}(?:${[rsNonAstral, rsRegional, rsSurrPair].join("|")})${rsOptVar + reOptMod})*`;
const rsSeq = rsOptVar + reOptMod + rsOptJoin;
const rsNonAstralCombo = `${rsNonAstral}${rsCombo}?`;
const rsSymbol = `(?:${[rsNonAstralCombo, rsCombo, rsRegional, rsSurrPair, rsAstral].join("|")})`;

/** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
const reUnicode = RegExp(`${rsFitz}(?=${rsFitz})|${rsSymbol + rsSeq}`, "g");

const MAX_INTEGER = 1.7976931348623157e+308;

// deno-lint-ignore no-explicit-any
export function chunk(array: Array<any>, size = 1) {
  size = Math.max(toInteger(size), 0);
  const length = array == null ? 0 : array.length;
  if (!length || size < 1) {
    return [];
  }
  let index = 0;
  let resIndex = 0;
  const result = new Array(Math.ceil(length / size));

  while (index < length) {
    result[resIndex++] = slice(array, index, index += size);
  }
  return result;
}
function toInteger(value: number) {
  const result = toFinite(value);
  const remainder = result % 1;

  return remainder ? result - remainder : result;
}
/**
 * Converts `value` to a finite number.
 *
 * @since 4.12.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted number.
 * @example
 *
 * toFinite(3.2)
 * // => 3.2
 *
 * toFinite(Number.MIN_VALUE)
 * // => 5e-324
 *
 * toFinite(Infinity)
 * // => 1.7976931348623157e+308
 *
 * toFinite('3.2')
 * // => 3.2
 */
function toFinite(value: number) {
  if (!value) {
    return value === 0 ? value : 0;
  }
  if (value === INFINITY || value === -INFINITY) {
    const sign = value < 0 ? -1 : 1;
    return sign * MAX_INTEGER;
  }
  return value === value ? value : 0;
}

// deno-lint-ignore no-explicit-any
export function compact(array: Array<any>): Array<any> {
  let resIndex = 0;
  // deno-lint-ignore no-explicit-any
  const result: Array<any> = [];

  if (array == null) return result;

  for (const value of array) {
    if (value) result[resIndex++] = value;
  }
  return result;
}

export function padStart(string: string | number, length: number, chars?: string) {
  const strLength = length && typeof string === "string" ? stringSize(string) : 0;
  return (length && strLength < length) ? createPadding(length - strLength, chars) + string : string || "";
}

function createPadding(length: number, chars?: string) {
  chars = chars === undefined ? " " : baseToString(chars);

  const charsLength = chars.length;
  if (charsLength < 2) return charsLength ? repeat(chars, length) : chars;
  const result = repeat(chars, Math.ceil(length / stringSize(chars)));
  return hasUnicode(chars) ? castSlice(stringToArray(result), 0, length).join("") : result.slice(0, length);
}

/**
 * The base implementation of `toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value: string | string[]): string {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    // Recursively convert values (susceptible to call stack limits).
    return `${value.map(baseToString)}`;
  }
  if (isSymbol(value)) {
    return Symbol.prototype.toString ? Symbol.prototype.toString.call(value) : "";
  }
  const result = `${value}`;
  return (result == "0" && (1 / value) == -INFINITY) ? "-0" : result;
}

function isSymbol(value: symbol | Record<string, symbol | string> | string) {
  const type = typeof value;
  return type == "symbol" || (type === "object" && value != null && getTag(value) == "[object Symbol]");
}

function getTag(value?: symbol | Record<string, symbol | string> | string) {
  if (!value) return value === undefined ? "[object Undefined]" : "[object Null]";
  return Object.prototype.toString.call(value);
}

/**
 * Checks if `string` contains Unicode symbols.
 *
 * @private
 * @param {string} string The string to inspect.
 * @returns {boolean} Returns `true` if a symbol is found, else `false`.
 */
function hasUnicode(string: string) {
  return reHasUnicode.test(string);
}

function repeat(string: string, n: number) {
  let result = "";
  if (!string || n < 1 || n > Number.MAX_SAFE_INTEGER) return result;
  do {
    if (n % 2) result += string;
    n = Math.floor(n / 2);
    if (n) string += string;
  } while (n);

  return result;
}

function stringSize(string: string) {
  return hasUnicode(string) ? unicodeSize(string) : asciiSize(string);
}

/**
 * Gets the size of a Unicode `string`.
 *
 * @private
 * @param {string} string The string inspect.
 * @returns {number} Returns the string size.
 */
function unicodeSize(string: string) {
  let result = reUnicode.lastIndex = 0;
  while (reUnicode.test(string)) {
    ++result;
  }
  return result;
}

function asciiSize({ length }: string) {
  return length;
}

function castSlice(array: string[], start: number, end: number) {
  const { length } = array;
  end = end === undefined ? length : end;
  return (!start && end >= length) ? array : slice(array, start, end);
}

function slice(array: string[], start: number, end: number) {
  let length = array == null ? 0 : array.length;
  if (!length) {
    return [];
  }
  start = start == null ? 0 : start;
  end = end === undefined ? length : end;

  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = end > length ? length : end;
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  let index = -1;
  const result = new Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

function stringToArray(string: string) {
  return hasUnicode(string) ? unicodeToArray(string) : asciiToArray(string);
}

function unicodeToArray(string: string) {
  return string.match(reUnicode) || [];
}
function asciiToArray(string: string) {
  return string.split("");
}
