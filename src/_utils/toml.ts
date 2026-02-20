import { DPath } from "../../deps.ts";

/** TOML to JSON */
// deno-lint-ignore no-explicit-any
const tomlJson = (source: { fileUrl?: string; data?: string }): any => {
  let arr: Array<string> = [];
  if (source.fileUrl) {
    const UInt = Deno.readFileSync(DPath.resolve(".", source.fileUrl));
    arr = new TextDecoder().decode(UInt).toString().split("\n");
  } else if (source.data) {
    arr = source.data.split("\n");
  } else {
    return {};
  }

  // deno-lint-ignore no-explicit-any
  const obj: any = {};
  let key = "";

  /** The key is array of Line breaks */
  let keyArrayB = "";

  /** The value is array of Line breaks */
  let valueArrayB = "";

  arr = arr.map((str) => str.replaceAll("\r", ""));

  for (const str of arr) {
    if (str.indexOf("#") !== -1) continue;

    let noSpace = str.replace(/(^ +)|( +$)/g, "");

    if (noSpace !== "") {
      if (valueArrayB !== "") {
        valueArrayB += str.replace(/(^ +)|( +$)/g, "");
      }

      if (valueArrayB === "" || (valueArrayB !== "" && str === "]")) {
        // Synthesize array string
        if (valueArrayB !== "") {
          noSpace = `${keyArrayB} = ${valueArrayB}`;
        }

        const value = /^\[(.+)\]$/.exec(noSpace);

        // if it's obj
        if (value && valueArrayB === "") {
          if (value[1].indexOf(".") === -1) {
            key = value[1];
            obj[key] = {};
          } else {
            objAdd(obj, value[1]);
          }
        } else {
          valueArrayB = "";
          keyArrayB = "";

          const testSyntax = /^(.+)=(.+)/.exec(noSpace);
          if (testSyntax && testSyntax.length > 0) {
            const k = testSyntax[1];
            const v = testSyntax[2];
            if (k[k.length - 1] !== " " && v[v.length - 1] !== " ") {
              throw new Error(
                "Syntaxe like \"key='value'\" is not allowed! You have to replace \"key='value'\" by \"key = 'value'\" with spaces on each side of the equal sign.",
              );
            }
          }
          const sttr = /^(.+) = (.+)/.exec(noSpace);

          if (sttr) {
            // It's array of Line breaks
            if (sttr[2] === "[") {
              keyArrayB = sttr[1];
              valueArrayB = "[";
            } else {
              const sttrValue = attrValueGet(sttr[2]);
              if (key === "") {
                obj[sttr[1]] = sttrValue;
              } else {
                setAttrValue(obj, sttr[1], sttrValue);
              }
            }
          }
        }
      }
    }
  }
  return obj;
};

/** set value for object attribute of last */
// deno-lint-ignore no-explicit-any
const setAttrValue = (obj: any, sttrKey: string, sttrValue: any) => {
  const keys = Object.keys(obj);
  let keyValue = "";
  for (const str of keys) {
    if (typeof obj[str] === "object" && !Array.isArray(obj[str])) {
      keyValue = str;
    }
  }

  if (keyValue === "") {
    obj[sttrKey] = sttrValue;
  } else {
    setAttrValue(obj[keyValue], sttrKey, sttrValue);
  }
};

/** get attribute value */
// deno-lint-ignore no-explicit-any
const attrValueGet = (str: string): any => {
  str = str.replace(/\"/g, "");

  // boolen
  if (str === "true") {
    return true;
  } else if (str === "false") {
    return false;
  }

  // number
  const numStr = /([\d\.]+)/.exec(str);
  if (
    numStr &&
    numStr[1] === str &&
    str.indexOf(".") === str.lastIndexOf(".")
  ) {
    return Number(str);
  }

  // Convert array string to array object
  const arr = /^\[(.+)\]$/.exec(str);

  if (arr) {
    return strToArr(arr[1]);
  }

  return str;
};

/** Convert string to array */
// deno-lint-ignore no-explicit-any
const strToArr = (str: string): Array<any> => {
  // deno-lint-ignore no-explicit-any
  let list: Array<any> = [];
  if (str.indexOf("[") === -1) {
    list = str.split(",");
  } else {
    const cArr = str.split("");
    let startNum = 0;
    let value = "";
    for (const c of cArr) {
      if (c === "[") {
        startNum++;
      } else if (c === "]") {
        startNum--;
      }

      if (startNum === 0 && c === ",") {
        list.push(value.replace(/(^ +)|( +$)/g, ""));
        value = "";
      } else {
        value += c;
      }
    }
    list.push(value.replace(/(^ +)|( +$)/g, ""));
  }

  // deno-lint-ignore no-explicit-any
  const arr: Array<any> = [];
  for (const n of list) {
    arr.push(attrValueGet(n));
  }

  return arr;
};

/** obj add */
// deno-lint-ignore no-explicit-any
const objAdd = (obj: any, str: string) => {
  const value = /^(.+)\.(.+)/.exec(str);
  if (value) {
    if (obj[value[1]]) {
      objAdd(obj[value[1]], value[2]);
    }
  } else {
    obj[str] = {};
  }
};

export default tomlJson;
