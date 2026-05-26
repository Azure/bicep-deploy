import path from 'path';
import fs from 'fs/promises';

const downloadBaseUrl = 'https://downloads.bicep.azure.com';
const latestReleaseUrl = `${downloadBaseUrl}/releases/latest`;
const downloadUrl = (tag: string, artifact: string) => `${downloadBaseUrl}/${tag}/${artifact}`;

async function getLatestRelease() {
  const response = await fetch(latestReleaseUrl);
  if (!response.ok) {
    throw `Failed to find latest release of Bicep CLI. Status code: ${response.status}`;
  }
  const body = await response.json() as { 'tag_name': string };

  return body['tag_name'];
}

function getDownloadUrlForTag(osPlat: string, osArch: string, tagName: string) {
  switch (`${osPlat}_${osArch}`.toLowerCase()) {
    case 'win32_x64': return downloadUrl(tagName, 'bicep-win-x64.exe');
    case 'win32_arm64': return downloadUrl(tagName, 'bicep-win-arm64.exe');
    case 'linux_x64': return downloadUrl(tagName, 'bicep-linux-x64');
    case 'linux_arm64': return downloadUrl(tagName, 'bicep-linux-arm64');
    case 'darwin_x64': return downloadUrl(tagName, 'bicep-osx-x64');
    case 'darwin_arm64': return downloadUrl(tagName, 'bicep-osx-arm64');
    default: throw `Bicep CLI is not available for platform ${osPlat} and architecture ${osArch}`;
  }
}

export async function getBicepCliDownloadUrl(platform: string, arch: string, version?: string) {
  const tagName = version ? `v${version}` : await getLatestRelease();

  return getDownloadUrlForTag(platform, arch, tagName);
}

export async function installBicepCliWithArch(basePath: string, platform: string, arch: string, version?: string) {
  const targetFile = platform === 'win32' ? 'bicep.exe' : 'bicep';
  const downloadUrl = await getBicepCliDownloadUrl(platform, arch, version);

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw `Failed to download Bicep CLI. Status code: ${response.status}`;
  }
  const buffer = await response.arrayBuffer();

  const toolPath = path.join(basePath, targetFile);
  await fs.writeFile(toolPath, new Uint8Array(buffer));
  await fs.chmod(toolPath, 0o755);

  return toolPath;
}