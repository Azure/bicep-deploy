"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = execute;
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const core_rest_pipeline_1 = require("@azure/core-rest-pipeline");
const deployments_1 = require("./deployments");
const stacks_1 = require("./stacks");
const whatif_1 = require("./whatif");
const utils_1 = require("./utils");
const output_1 = require("./output");
async function execute(config, files, logger, outputSetter) {
    try {
        (0, utils_1.validateFileScope)(config, files);
        switch (config.type) {
            case "deployment": {
                switch (config.operation) {
                    case "create": {
                        await (0, utils_1.tryWithErrorHandling)(async () => {
                            const result = await (0, deployments_1.deploymentCreate)(config, files, logger);
                            (0, output_1.setCreateOutputs)(config, outputSetter, result?.properties?.outputs);
                        }, error => {
                            logger.logError(JSON.stringify(error, null, 2));
                            outputSetter.setFailed("Create failed");
                        }, logger);
                        break;
                    }
                    case "validate": {
                        await (0, utils_1.tryWithErrorHandling)(async () => {
                            const result = await (0, deployments_1.deploymentValidate)(config, files, logger);
                            (0, utils_1.logDiagnostics)(result?.properties?.diagnostics ?? [], logger);
                        }, error => {
                            logger.logError(JSON.stringify(error, null, 2));
                            outputSetter.setFailed("Validation failed");
                        }, logger);
                        break;
                    }
                    case "whatIf": {
                        const result = await (0, deployments_1.deploymentWhatIf)(config, files, logger);
                        const formatted = (0, whatif_1.formatWhatIfOperationResult)(result, "ansii");
                        logger.logInfoRaw(formatted);
                        (0, utils_1.logDiagnostics)(result.diagnostics ?? [], logger);
                        break;
                    }
                }
                break;
            }
            case "deploymentStack": {
                switch (config.operation) {
                    case "create": {
                        await (0, utils_1.tryWithErrorHandling)(async () => {
                            const result = await (0, stacks_1.stackCreate)(config, files, logger);
                            (0, output_1.setCreateOutputs)(config, outputSetter, result?.properties?.outputs);
                        }, error => {
                            logger.logError(JSON.stringify(error, null, 2));
                            outputSetter.setFailed("Create failed");
                        }, logger);
                        break;
                    }
                    case "validate": {
                        await (0, utils_1.tryWithErrorHandling)(() => (0, stacks_1.stackValidate)(config, files, logger), error => {
                            logger.logError(JSON.stringify(error, null, 2));
                            outputSetter.setFailed("Validation failed");
                        }, logger);
                        break;
                    }
                    case "delete": {
                        await (0, stacks_1.stackDelete)(config, logger);
                        break;
                    }
                }
                break;
            }
        }
    }
    catch (error) {
        if (error instanceof core_rest_pipeline_1.RestError && error.response?.bodyAsText) {
            const correlationId = error.response.headers.get("x-ms-correlation-request-id");
            logger.logError(`Request failed. CorrelationId: ${correlationId}`);
            const responseBody = JSON.parse(error.response.bodyAsText);
            logger.logError(JSON.stringify(responseBody, null, 2));
        }
        outputSetter.setFailed("Operation failed");
        throw error;
    }
}
//# sourceMappingURL=handler.js.map