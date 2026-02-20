export enum Colors {
  Reset = "\x1b[0m",
  Bright = "\x1b[1m",
  Dim = "\x1b[2m",
  Italic = "\x1b[3m",
  Underscore = "\x1b[4m",
  Blink = "\x1b[5m",
  Reverse = "\x1b[7m",
  Hidden = "\x1b[8m",

  FgBlack = "\x1b[30m",
  FgRed = "\x1b[31m",
  FgGreen = "\x1b[32m",
  FgYellow = "\x1b[33m",
  FgBlue = "\x1b[34m",
  FgMagenta = "\x1b[35m",
  FgCyan = "\x1b[36m",
  FgWhite = "\x1b[37m",

  BgBlack = "\x1b[40m",
  BgRed = "\x1b[41m",
  BgGreen = "\x1b[42m",
  BgYellow = "\x1b[43m",
  BgBlue = "\x1b[44m",
  BgMagenta = "\x1b[45m",
  BgCyan = "\x1b[46m",
  BgWhite = "\x1b[47m",

  FgLiteBlack = "\x1b[90m",
  FgLiteRed = "\x1b[91m",
  FgLiteGreen = "\x1b[92m",
  FgLiteYellow = "\x1b[93m",
  FgLiteBlue = "\x1b[94m",
  FgLiteMagenta = "\x1b[95m",
  FgLiteCyan = "\x1b[96m",
  FgLiteWhite = "\x1b[97m",

  BgLiteBlack = "\x1b[100m",
  BgLiteRed = "\x1b[101m",
  BgLiteGreen = "\x1b[102m",
  BgLiteYellow = "\x1b[103m",
  BgLiteBlue = "\x1b[104m",
  BgLiteMagenta = "\x1b[105m",
  BgLiteCyan = "\x1b[106m",
  BgLiteWhite = "\x1b[107m",
}

export interface LoggerOptions {
  prefix?: string | null;
  colorize?: boolean;
  preLine?: string;
  color?: string;
}

class Logger {
  private options: LoggerOptions;
  constructor(options: LoggerOptions = {}) {
    if (options.colorize === undefined) options.colorize = true;
    if (options.preLine === undefined) options.preLine = "  ";
    this.options = options;
  }

  static create(options: LoggerOptions): Logger {
    return new Logger(options);
  }

  // deno-lint-ignore no-explicit-any
  log(...args: any): void {
    const options = Object.assign(this.options, { color: Colors.FgWhite });
    this.handle(options, ...args);
  }

  // deno-lint-ignore no-explicit-any
  success(...args: any): void {
    const options = Object.assign(this.options, { color: Colors.FgLiteGreen });
    this.handle(options, ...args);
  }

  // deno-lint-ignore no-explicit-any
  info(...args: any): void {
    const options = Object.assign(this.options, { color: Colors.FgLiteBlue });
    this.handle(options, ...args);
  }

  // deno-lint-ignore no-explicit-any
  warn(...args: any): void {
    const options = Object.assign(this.options, { color: Colors.FgLiteYellow });
    this.handle(options, ...args);
  }

  // deno-lint-ignore no-explicit-any
  error(...args: any): void {
    const options = Object.assign(this.options, { color: Colors.FgLiteRed });
    this.handle(options, ...args);
  }

  // deno-lint-ignore no-explicit-any
  debug(...args: any): void {
    const options = Object.assign(this.options, { color: Colors.FgLiteMagenta });
    this.handle(options, ...args);
  }

  // deno-lint-ignore no-explicit-any
  private handle(options: LoggerOptions, ...args: any): void {
    console.log(
      (this.options.colorize) ? Colors.FgLiteCyan : "",
      `[${new Date().toISOString()}]`,
      (this.options.colorize) ? options.color : "",
      options.prefix,
      // deno-lint-ignore no-explicit-any
      args.map((arg: any) => {
        return (typeof arg === "string" || typeof args === "number")
          ? arg
          : (arg instanceof Error)
          ? `${arg.stack}`
          : (arg instanceof Array)
          ? arg.toString()
          : (typeof arg === "object")
          ? JSON.stringify(arg)
          : arg;
      }).join(" "),
      (this.options.colorize) ? Colors.Reset : "",
    );
  }
}

export default Logger;
