"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCreateOutputs = setCreateOutputs;
function setCreateOutputs(config, outputSetter, outputs) {
    if (!outputs) {
        return;
    }
    for (const key of Object.keys(outputs)) {
        const output = outputs[key];
        outputSetter.setOutput(key, output.value);
        if (config.maskedOutputs &&
            config.maskedOutputs.some(x => x.toLowerCase() === key.toLowerCase())) {
            outputSetter.setSecret(output.value);
        }
    }
}
//# sourceMappingURL=output.js.map