import { type Middleware, Etl, Source, Destination, loadRdf } from '@triplyetl/etl/generic'
import { destination, prefix } from './odissei_kg_utils.js'
import https from 'https';
import fs from 'fs';
import path from 'path';


const DataverseApi = prefix.dataverseAPI
// cons DaverseAPI = ''

/**
 * We start with dataverse ID 1
 * We fetch the dataverse metadata object (https://datasets.iisg.amsterdam/api/dataverses/1),
 *    and the corresponding contents (https://datasets.iisg.amsterdam/api/dataverses/1/contents)
 * The content array may reference a dataset or other dataverses.
 *   - Datasets are fetched from eg https://datasets.iisg.amsterdam/api/datasets/9820
 *   - If it's a dataverse reference, we recurse and fetch it's metadata, contents, and all the things it references
 */
export default function fromApi (destination: any): Middleware {
  return async function _fromApi (ctx, next) {
    async function handleDataverse (dataverseId: number, parentDataverseId?: number): Promise <void> {
      const [dataverse, dataverseContents] = await fetchDataverse(dataverseId)
      dataverse.type = 'dataverse'
      console.info(dataverse.alias)
      if (parentDataverseId !== undefined) dataverse.parentDataverseId = parentDataverseId
      await next(dataverse, ctx.app.getNewStore())
      for (const contents of dataverseContents) {
        contents.parentDataverseId = dataverseId
        if (contents.type === 'dataset') {
          try {
            let datasetUrl = getDatasetUrl(contents.protocol, contents.identifier, contents.authority)   
            //loadRdf(Source.url(datasetUrl))
            //console.log('Load dataset from: ' + datasetUrl)
            datasetUrl = await fixVariableURIs(datasetUrl)
            console.info('Datasetfile at: ' + datasetUrl)
            //await ctx.app.copySource(Source.url(datasetUrl), destination)
            await ctx.app.copySource(Source.file(datasetUrl), destination)
            await next();
          } catch (e) {
            console.warn(`Ignoring this error: ${(e as Error).message}`)
            if (!(e as Error).message.startsWith('[500]')) {
              throw e
            }
          }
        } else {
          await handleDataverse(contents.id, dataverseId)
        }
      }
    }
    await handleDataverse(1)
  }
}

async function fetchDataverse (dataverseId: number): Promise<[any, any]> {
  let dataverse: any
  let dataverseContents: any
  [dataverse, dataverseContents] = await Promise.all(
    [`${DataverseApi}/dataverses/${dataverseId}`, `${DataverseApi}/dataverses/${dataverseId}/contents`].map(
      async (link) => {
        const response = await fetch(link)
        if (response.status !== 200) {
          throw new Error(`[${response.status}] Failed fetching ${link}: ${response.statusText}`)
        }
        //return await response.json()
        return response.json()
      }
    )
  )
  /**
   * Remove annoying `data: {}` envelope
   */
  dataverse = { ...dataverse, ...dataverse.data }
  delete dataverse.data
  dataverseContents = dataverseContents.data

  return [dataverse, dataverseContents] as [any, any]
}
function getDatasetUrl (protocol: string, datasetId: number, authority: string) {
  //const link = `${DataverseApi}/datasets/export?exporter=dataverse_json&persistentId=${protocol}:${authority}/${datasetId}`
  const link = '${DataverseApi}/datasets/export?exporter=OAI_ORE&persistentId=${protocol}:${authority}/${datasetId}'
  const link2 = DataverseApi + '/datasets/export?exporter=OAI_ORE&persistentId=' + protocol + ':' + authority + '/' + datasetId
  console.info('Fetching dataset from: ' + link2)
  return link2
  // const response = await fetch(link2)
  // if (response.status !== 200) throw new Error(`[${response.status}] Failed fetching ${link}: ${response.statusText}`)
  // let json: any
  // json = await response.json()
  // console.info(json)
  // json = { ...json, ...json.data }
  // delete json.data
  // return json


  /*loadRdf(
    Source.file("./static/dataverseTest.jsonld")
  )*/
}

/**
 * Fetch JSON-LD from a URL, convert http-prefixed string values to @id objects
 * (excluding reserved keys and anything inside @context), and write the result to a file.
 */
export async function fixVariableURIs(url: string, outputPath?: string): Promise<string> {
  const jsonText = await fetchText(url);
  const jsonLd = JSON.parse(jsonText);

  const modified = convertHttpStringsToIRIs(jsonLd, false);
  const fileContent = JSON.stringify(modified, null, 2);

  const outPath = outputPath || path.resolve(process.cwd(), 'modified.jsonld');
  fs.writeFileSync(outPath, fileContent, 'utf8');

  return outPath;
}

/**
 * Recursively walks the JSON-LD and replaces string values starting with http
 * with { "@id": value }, except for reserved keys and anything inside @context.
 */
function convertHttpStringsToIRIs(node: any, insideContext: boolean, parentKey: string | null = null): any {
  if (Array.isArray(node)) {
    return node.map((item) => convertHttpStringsToIRIs(item, insideContext, parentKey));
  }

  if (typeof node === 'object' && node !== null) {
    // If we're inside @context, preserve everything exactly
    if (parentKey === '@context') {
      return node;
    }

    const result: any = {};
    for (const [key, value] of Object.entries(node)) {
      const isContext = insideContext || key === '@context';
      result[key] = convertHttpStringsToIRIs(value, isContext, key);
    }
    return result;
  }

  const reservedKeys = ['@id', '@type', '@context', '@value', '@language'];
  if (
    typeof node === 'string' &&
    node.startsWith('http') &&
    !insideContext &&
    (!parentKey || !reservedKeys.includes(parentKey))
  ) {
    return { '@id': node };
  }

  return node;
}

/**
 * Fetch text content from a URL using Node's built-in HTTPS module.
 */
function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch: ${res.statusCode}`));
        return;
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}
