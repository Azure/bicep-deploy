"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../src/utils");
describe("validateFileScope", () => {
    it("should ignore empty template", () => {
        expect(() => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (0, utils_1.validateFileScope)({ scope: { type: "subscription" } }, {
            templateContents: {},
        })).not.toThrow();
    });
    it("should ignore non-Bicep templates", () => {
        expect(() => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (0, utils_1.validateFileScope)({ scope: { type: "subscription" } }, {
            templateContents: {
                $schema: "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            },
        })).not.toThrow();
    });
    it("should validate Bicep templates", () => {
        expect(() => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (0, utils_1.validateFileScope)({ scope: { type: "subscription" } }, {
            templateContents: {
                $schema: "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
                metadata: { _generator: { name: "bicep" } },
            },
        })).toThrow("The target scope resourceGroup does not match the deployment scope subscription.");
    });
    const schemaLookup = {
        tenant: "https://schema.management.azure.com/schemas/2019-08-01/tenantDeploymentTemplate.json#",
        managementGroup: "https://schema.management.azure.com/schemas/2019-08-01/managementGroupDeploymentTemplate.json#",
        subscription: "https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#",
        resourceGroup: "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    };
    const scopes = [
        "tenant",
        "managementGroup",
        "subscription",
        "resourceGroup",
    ];
    it.each(scopes)("should validate %s scope", scope => {
        expect(() => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (0, utils_1.validateFileScope)({ scope: { type: scope } }, {
            templateContents: {
                $schema: schemaLookup[scope],
                metadata: { _generator: { name: "bicep" } },
            },
        })).not.toThrow();
    });
});
//# sourceMappingURL=utils.test.js.map