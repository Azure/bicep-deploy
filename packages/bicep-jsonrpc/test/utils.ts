import os from 'os';
import path from 'path';
import { mkdir } from 'fs/promises';
import { GetDeploymentGraphResponse, GetMetadataResponse, SymbolDefinition, Range } from "../src";

export async function getUniqueTmpDir(name: string) {
  const basePath = path.join(os.tmpdir(), name);
  await mkdir(basePath, { recursive: true });

  return basePath;
}

export function normalizeNewlines(input: string) {
  return input.replace(/\r\n/g, '\n');
}

export function formatMarkdown(metadata: GetMetadataResponse, graph: GetDeploymentGraphResponse, fileName: string) {
  const description = metadata.metadata.find(x => x.name === 'description')?.value;

  const descriptionSection = description ? `
## Description

${description}

` : '';

  const graphSection = graph.nodes.length > 0 ? `
## Graph

\`\`\`mermaid
flowchart LR;
${graph.nodes.map(x => 
`    ${x.name}["${x.name} ${x.isExisting ? '(existing)' : ''}
    ${x.type}"]
`).join('')}
${graph.edges.map(x => 
`    ${x.source}-->${x.target};
`).join('')}
\`\`\`

` : '';

  const parametersSection = metadata.parameters.length > 0 ? `
## Parameters

| Name | Type | Description |
| -- | -- | -- |
${metadata.parameters.map(x => {
  const { name, type, description } = getFormattedRow(x);

  return `| ${name} | ${type} | ${description} |
`;
}).join('')}

` : '';

  const outputsSection = metadata.outputs.length > 0 ? `
## Outputs

| Name | Type | Description |
| -- | -- | -- |
${metadata.outputs.map(x => {
  const { name, type, description } = getFormattedRow(x);

  return `| ${name} | ${type} | ${description} |
`;
}).join('')}

` : '';

  return descriptionSection +
    graphSection +
    parametersSection +
    outputsSection;

  function getFormattedRow(param: SymbolDefinition) {
    return {
      name: formatCodeLink(param.name, param.range),
      type: param.type ? formatCodeLink(param.type?.name, param.type?.range) : '',
      description: param.description ?? '',
    }
  }

  function formatCodeLink(contents: string, range?: Range) {
    if (!range) {
      return `\`${contents}\``;
    }

    return `[\`${contents}\`](./${fileName}#L${range.start.line + 1}C${range.start.char + 1}-L${range.end.line + 1}C${range.end.char + 1})`; 
  }
}