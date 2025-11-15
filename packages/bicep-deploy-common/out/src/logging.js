"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorStringBuilder = exports.Color = void 0;
exports.colorize = colorize;
exports.removeColors = removeColors;
exports.getColorString = getColorString;
var Color;
(function (Color) {
    Color["Reset"] = "\u001B[0m";
    Color["Red"] = "\u001B[31m";
    Color["Green"] = "\u001B[32m";
    Color["Yellow"] = "\u001B[33m";
    Color["Blue"] = "\u001B[34m";
    Color["Magenta"] = "\u001B[35m";
    Color["Cyan"] = "\u001B[36m";
    Color["White"] = "\u001B[37m";
})(Color || (exports.Color = Color = {}));
const colorToName = {
    "\u001b[0m": "Reset",
    "\u001b[31m": "Red",
    "\u001b[32m": "Green",
    "\u001b[33m": "Yellow",
    "\u001b[34m": "Blue",
    "\u001b[35m": "Magenta",
    "\u001b[36m": "Cyan",
    "\u001b[37m": "White",
};
function colorize(message, color) {
    return message
        .split("\n")
        .map(line => `${color}${line}${Color.Reset}`)
        .join("\n");
}
function removeColors(message) {
    for (const color in colorToName) {
        message = message.replaceAll(color, "");
    }
    return message;
}
function getColorString(colorMode, color) {
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
class ColorStringBuilder {
    constructor(colorMode) {
        this.colorMode = colorMode;
        this.colorStack = [];
        this.buffer = "";
    }
    append(value, color) {
        if (color) {
            this.pushColor(color);
        }
        this.buffer += value;
        if (color) {
            this.popColor();
        }
        return this;
    }
    appendLine(value = "") {
        return this.append(value + "\n");
    }
    withColorScope(color, action) {
        this.pushColor(color);
        action();
        this.popColor();
    }
    pushColor(color) {
        this.colorStack.push(color);
        this.buffer += getColorString(this.colorMode, color);
    }
    popColor() {
        this.colorStack.pop();
        const prevColor = this.colorStack[this.colorStack.length - 1] ?? Color.Reset;
        this.buffer += getColorString(this.colorMode, prevColor);
    }
    build() {
        return this.buffer;
    }
}
exports.ColorStringBuilder = ColorStringBuilder;
//# sourceMappingURL=logging.js.map