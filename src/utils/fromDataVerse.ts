import { Etl, environments, type Middleware, Source } from '@triplyetl/etl/generic'
import { prefix } from './odissei_kg_utils.js'
import https from 'https';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const DataverseApi = prefix.dataverseAPI

/**
 * Helper to fetch a URL using dynamic native fetch with exponential backoff retries.
 * This directly mitigates ECONNRESET and network fluctuation crashes.
 */
async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      
      // If server returned a client/server error, log it before retrying
      console.warn(`[Attempt ${i + 1}/${retries}] Fetch failed for ${url} with status ${response.status}`);
    } catch (err) {
      console.warn(`[Attempt ${i + 1}/${retries}] Network error fetching ${url}: ${(err as Error).message}`);
    }
    if (i < retries - 1) {
      await new Promise((res) => setTimeout(res, delay * Math.pow(2, i)));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts.`);
}

/**
 * We start with dataverse ID 1 - Odissei Portal, which is the root of the subtree. 
 * We fetch the dataverse metadata object (https://datasets.iisg.amsterdam/api/dataverses/1),
 * and the corresponding contents (https://datasets.iisg.amsterdam/api/dataverses/1/contents)
 * The content array may reference a dataset or other dataverses.
 * - Datasets are fetched from eg https://datasets.iisg.amsterdam/api/datasets/9820
 * - If it's a dataverse reference, we recurse and fetch it's metadata, contents, and all the things it references
 */
export default function fromApi (destination: any): Middleware {
  return async function _fromApi (ctx, next) {
    async function handleDataverse (dataverseId: number, parentDataverseId?: number): Promise <void> {
      // Clean, dynamic fallback using the mapping

      const [dataverse, dataverseContents] = await fetchOdisseiDatasets()
      dataverse.type = 'dataverse'
      console.info(`Processing subtree mapping: ${dataverse.description}`)
      
      if (parentDataverseId !== undefined) dataverse.parentDataverseId = parentDataverseId
      await next(dataverse, ctx.app.getNewStore())
      
      for (const contents of dataverseContents) {
        contents.parentDataverseId = dataverseId
        if (contents.type === 'dataset') {
          try {
            let datasetUrl = getDatasetUrl(contents.global_id) 
            
            // Register source utilizing our custom fetch with retry mechanism internally
            const sourceUrlObj = Source.url(datasetUrl);
            
            // Fetch source and copy to destination
            await ctx.app.copySource(sourceUrlObj, destination)
            await next();
          } catch (e) {
            console.warn(`Ignoring this dataset error: ${(e as Error).message}`)
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

/**
 * Fetches all dataset records from the Odissei Portal API by paginating 
 * through the results until the end is reached.
 * @returns {Promise<[any, any]>} A tuple containing:
 * - [0]: The dataverse collection metadata.
 * - [1]: The dataset contents array.
 */
async function fetchOdisseiDatasets(): Promise<[any, any]> {
  const baseUrl = 'https://portal.odissei.nl/api/search';
  const records_per_page = 250; // search results records per page
  const queryParams = new URLSearchParams({
    q: '*',
    type: 'dataset',
    per_page: records_per_page.toString()
  });

  let start = 0;
  let allRecords: any[] = [];
  let hasMore = true;

  while (hasMore) {
    queryParams.set('start', start.toString());
    const url = `${baseUrl}?${queryParams.toString()}`;
    console.info(`Querying dataset identifiers from: ${url}`);
    
    // Wrapped in fetchWithRetry to tolerate search endpoint timeouts
    const response = await fetchWithRetry(url);
    const payload = await response.json();
    const records = payload.data?.items || payload.results || [];

    if (!Array.isArray(records) || records.length === 0) {
      hasMore = false;
    } else {
      allRecords.push(...records);  
      if (records.length < records_per_page) {
        hasMore = false;
      } else {
        start += records_per_page;
        if (Etl.environment == environments.Testing) {
          hasMore = false;
          console.warn("Just testing first page results");
        }
      }
    }
  }

  console.info(`Successfully fetched a total of ${allRecords.length} records.`);

  const dataverseMetadata = {
    description: `Auto-generated container for: ${DataverseApi}`
  };

  return [dataverseMetadata, allRecords] as [any, any];
}

/**
 * * @param pId Dataset persistent ID (e.g., "doi:10.34894/3XQJ8K") 
 * @returns The URL to fetch the dataset in OAI-ORE format from the Dataverse API.
 */ 
function getDatasetUrl (pId: string) {
  const link2 =  DataverseApi + '/datasets/export?exporter=OAI_ORE&persistentId=' + pId
  console.info('Fetching dataset from: ' + link2)
  return link2
}

/**
 * Fetch JSON-LD from a URL, convert http-prefixed string values to @id objects
 * (excluding reserved keys and anything inside @context), and write the result to a file.
 *
 * @param url - The source URL to fetch JSON-LD from.
 * @param outputPath - Optional path to write the modified JSON-LD file.
 * @returns A file:// URL pointing to the output file.
 */
export async function fixVariableURIs(url: string, outputPath?: string): Promise<string> {
  const jsonText = await fetchText(url);
  const jsonLd = JSON.parse(jsonText);

  const modified = convertHttpStringsToIRIs(jsonLd, false);
  const absolutePath = path.resolve(outputPath || 'modified.jsonld');

  fs.writeFileSync(absolutePath, JSON.stringify(modified, null, 2), 'utf8');
  return pathToFileURL(absolutePath).toString();
}

/**
 * Recursively walk JSON-LD to replace http-prefixed strings with { "@id": value },
 * unless inside @context or reserved keys.
 */
function convertHttpStringsToIRIs(node: any, insideContext: boolean, parentKey: string | null = null): any {
  if (Array.isArray(node)) {
    return node.map((item) => convertHttpStringsToIRIs(item, insideContext, parentKey));
  }

  if (typeof node === 'object' && node !== null) {
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
 * Fetch plain text from a URL using native Node.js HTTPS with retry logic.
 */
function fetchText(url: string, retries = 3, delay = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    function attempt(remaining: number) {
      https.get(url, (res) => {
        if (res.statusCode !== 200) {
          if (remaining > 0) {
            console.warn(`[HTTP Error ${res.statusCode}] Retrying fetchText for: ${url}`);
            setTimeout(() => attempt(remaining - 1), delay);
          } else {
            reject(new Error(`Failed to fetch: ${res.statusCode}`));
          }
          return;
        }

        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      }).on('error', (err) => {
        if (remaining > 0) {
          console.warn(`[Network Error] ${err.message}. Retrying fetchText for: ${url}`);
          setTimeout(() => attempt(remaining - 1), delay);
        } else {
          reject(err);
        }
      });
    }
    attempt(retries);
  });
}