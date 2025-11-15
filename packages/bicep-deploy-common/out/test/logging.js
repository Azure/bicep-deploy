"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestLogger = void 0;
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const logging_1 = require("../src/logging");
const logWarningRaw = (message) => console.warn(message);
const logErrorRaw = (message) => console.error(message);
class TestLogger {
    constructor() {
        this.isDebugEnabled = () => true;
        this.debug = (message) => console.debug(message);
        this.logInfoRaw = (message) => console.info(message);
        this.logInfo = (message) => this.logInfoRaw((0, logging_1.colorize)(message, logging_1.Color.Blue));
        this.logWarning = (message) => logWarningRaw((0, logging_1.colorize)(message, logging_1.Color.Yellow));
        this.logError = (message) => logErrorRaw((0, logging_1.colorize)(message, logging_1.Color.Red));
    }
}
exports.TestLogger = TestLogger;
//# sourceMappingURL=logging.js.map