import { Bicep } from "../src";
import path from "path";
import os from "os";
import { spawnSync } from 'child_process';
import { formatMarkdown, getUniqueTmpDir, normalizeNewlines } from "./utils";
import { readFile } from 'fs/promises';

let bicep: Bicep;
async function onBeforeAll() {
  let bicepPath = process.env.BICEP_CLI_EXECUTABLE;
  if (!bicepPath) {
    const basePath = await getUniqueTmpDir('default');
    bicepPath = await Bicep.install(basePath);
  }

  bicep = await Bicep.initialize(bicepPath);
}

function onAfterAll() {
  bicep?.dispose();
}

beforeAll(onBeforeAll, 60000);
afterAll(onAfterAll);

describe("Bicep class", () => {
  it('can return the Bicep CLI download URL', async () => {
    const downloadUrl = await Bicep.getDownloadUrl('0.24.24', 'linux','x64');

    expect(downloadUrl).toBe('https://downloads.bicep.azure.com/v0.24.24/bicep-linux-x64');
  }, 60000);

  it('can install bicep', async () => {
    const basePath = await getUniqueTmpDir('installTest');
    const cliPath = await Bicep.install(basePath);

    const cliName = os.platform() === 'win32' ? 'bicep.exe' : 'bicep';
    expect(cliPath).toBe(path.join(basePath, cliName));

    const result = spawnSync(cliPath,['--version'], { encoding: 'utf-8' });
    expect(result.stdout).toContain('Bicep CLI version');
    expect(result.status).toBe(0);
  }, 60000);

  it("should return the bicep version", async () => {
    const version = await bicep.version();

    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("should build a bicep file", async () => {
    const result = await bicep.compile({
      path: path.join(__dirname, "samples/good.bicep"),
    });

    expect(result.success).toBeTruthy();
    expect(result.contents?.length).toBeGreaterThan(0);
  });

  it("should build a bicepparam file", async () => {
    const result = await bicep.compileParams({
      path: path.join(__dirname, "samples/bicepparam/main.bicepparam"),
      parameterOverrides: {
        foo: "OVERIDDEN",
      }
    });

    expect(result.success).toBeTruthy();
    expect(result.parameters?.length).toBeGreaterThan(0);
    expect(JSON.parse(result.parameters!).parameters.foo.value).toBe('OVERIDDEN');
  });

  it("should return diagnostics if the bicep file has errors", async () => {
    const result = await bicep.compile({
      path: path.join(__dirname, "samples/bad.bicep"),
    });

    expect(result.success).toBeFalsy();
    expect(result.contents).toBeUndefined();
    const error = result.diagnostics.filter(x => x.level === 'Error')[0];
    expect(error.code).toBe('BCP007')
    expect(error.message).toBe('This declaration type is not recognized. Specify a metadata, parameter, variable, resource, or output declaration.');
  });

  it("should get metadata for a bicep file", async () => {
    const result = await bicep.getMetadata({
      path: path.join(__dirname, "samples/good.bicep"),
    });

    expect(result.parameters[0].description).toBe('Specifies the location of AKS cluster.');
    expect(result.outputs[0].description).toBe('The virtual network resource id.');
    expect(result.metadata[0].name).toBe('description');
    expect(result.metadata[0].value).toBe('Test template');
  });

  it("should get the deployment graph for a bicep file", async () => {
    const result = await bicep.getDeploymentGraph({
      path: path.join(__dirname, "samples/good.bicep"),
    });

    expect(result.nodes.map(x => x.name)).toEqual([
      'aksSubnet',
      'bastionSubnet',
      'bastionSubnetNsg',
      'virtualNetwork',
      'vmSubnet',
      'vmSubnetNsg',
    ]);
    expect(result.edges).toEqual([
      { source: 'aksSubnet', target: 'virtualNetwork' },
      { source: 'bastionSubnet', target: 'virtualNetwork' },
      { source: 'virtualNetwork', target: 'bastionSubnetNsg' },
      { source: 'virtualNetwork', target: 'vmSubnetNsg' },
      { source: 'vmSubnet', target: 'virtualNetwork'}
    ]);
  });

  it("can be used to construct documentation", async () => {
    const filePath = path.join(__dirname, "samples/good.bicep");
    const fileName = path.basename(filePath);
    const metadata = await bicep.getMetadata({ path: filePath });
    const graph = await bicep.getDeploymentGraph({ path: filePath });

    const generatedMarkdown = formatMarkdown(metadata, graph, fileName);

    const mdFilePath = path.join(__dirname, "samples/good.md");
    const actualMarkdown = await readFile(mdFilePath, 'utf-8');

    expect(normalizeNewlines(generatedMarkdown)).toEqual(normalizeNewlines(actualMarkdown));
  });

  it("should return file references for a bicep file", async () => {
    const bicepPath = path.join(__dirname, "samples/good.bicep");
    const result = await bicep.getFileReferences({
      path: bicepPath,
    });

    expect(result.filePaths).toEqual([
      path.join(bicepPath, '../bicepconfig.json'),
      bicepPath,
    ]);
  });

  it("should generate a snapshot for a bicep file", async () => {
    const bicepPath = path.join(__dirname, "samples/bicepparam/main.bicepparam");
    const result = await bicep.getSnapshot({
      path: bicepPath,
      metadata: {
        tenantId: "00000000-0000-0000-0000-000000000000",
        subscriptionId: "00000000-0000-0000-0000-000000000000",
        resourceGroup: "test-rg",
        location: "eastus",
        deploymentName: "test-deployment",
      },
    });

    const snapshotFilePath = path.join(__dirname, "samples/bicepparam/main.snapshot.json");
    const actualSnapshot = await readFile(snapshotFilePath, 'utf-8');

    expect(normalizeNewlines(result.snapshot)).toEqual(normalizeNewlines(actualSnapshot));
  });

  // TODO uncomment after 0.37.X is released
  // it("should format a bicep file", async () => {
  //   const bicepPath = path.join(__dirname, "samples/good.bicep");
  //   const result = await bicep.format({
  //     path: bicepPath,
  //   });

  //   const formattedFilePath = path.join(__dirname, "samples/good.formatted.bicep");
  //   const actualFormatted = await readFile(formattedFilePath, 'utf-8');

  //   expect(normalizeNewlines(result.contents)).toEqual(normalizeNewlines(actualFormatted));
  // });

  it("should throw for an invalid bicep exe path", async () => {
    try {
      await Bicep.initialize('asdasdfasdfsdff');
      expect(false).toBeTruthy();
    } catch (e) {
      expect(e).toMatch(/^Failed to invoke /);
    }
  });
});

