// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
export interface Logger {
  isDebugEnabled(): boolean;
  debug(message: string): void;
  logInfo(message: string): void;
  logWarning(message: string): void;
  logError(message: string): void;
  logInfoRaw(message: string): void;
}

export type ColorMode = "off" | "ansii" | "debug"; // debug is just used for unit testing

export enum Color {
  Reset = "\x1b[0m",
  Red = "\x1b[31m",
  Green = "\x1b[32m",
  Yellow = "\x1b[33m",
  Blue = "\x1b[34m",
  Magenta = "\x1b[35m",
  Cyan = "\x1b[36m",
  White = "\x1b[37m",
}

const colorToName: Record<Color, string> = {
  "\u001b[0m": "Reset",
  "\u001b[31m": "Red",
  "\u001b[32m": "Green",
  "\u001b[33m": "Yellow",
  "\u001b[34m": "Blue",
  "\u001b[35m": "Magenta",
  "\u001b[36m": "Cyan",
  "\u001b[37m": "White",
};

export function colorize(message: string, color: Color) {
  return message
    .split("\n")
    .map(line => `${color}${line}${Color.Reset}`)
    .join("\n");
}

export function removeColors(message: string) {
  for (const color in colorToName) {
    message = message.replaceAll(color, "");
  }

  return message;
}

export function getColorString(colorMode: ColorMode, color: Color): string {
  switch (colorMode) {
    case "off":
      return "";
    case "ansii":
      return color;
    case "debug":
      return `<${colorToName[color].toUpperCase()}>`;
  }

  return color;
}

export class ColorStringBuilder {
  private colorStack: Color[] = [];
  private buffer: string = "";
  constructor(private colorMode: ColorMode) {}

  append(value: string, color?: Color): this {
    if (color) {
      this.pushColor(color);
    }

    this.buffer += value;

    if (color) {
      this.popColor();
    }

    return this;
  }

  appendLine(value: string = ""): this {
    return this.append(value + "\n");
  }

  withColorScope(color: Color, action: () => void): void {
    this.pushColor(color);
    action();
    this.popColor();
  }

  private pushColor(color: Color) {
    this.colorStack.push(color);
    this.buffer += getColorString(this.colorMode, color);
  }

  private popColor() {
    this.colorStack.pop();
    const prevColor =
      this.colorStack[this.colorStack.length - 1] ?? Color.Reset;
    this.buffer += getColorString(this.colorMode, prevColor);
  }

  build(): string {
    return this.buffer;
  }
}
