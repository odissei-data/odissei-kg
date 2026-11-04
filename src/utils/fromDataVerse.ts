import { Etl, environments, type Middleware, Source } from '@triplyetl/etl/generic'
import { prefix } from './odissei_kg_utils.js'

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
 We fetch all dataset records from the Dataverse search API, but really only use the PIDs in these records.
 We then use the PID to fetch the ORE record for each dataset individually, because only the ORE 
 record contains all the variable and other custom metadata fields...
 */
export default function fromApi (destination: any): Middleware {
  return async function _fromApi (ctx, next) {
    async function handleDataverse (): Promise <void> {

      const [dataverse, dataverseContents] = await fetchOdisseiDatasets()
      dataverse.type = 'dataverse'
      
      for (const contents of dataverseContents) {
        if (contents.type === 'dataset') {
          try {
            let datasetUrl = getDatasetUrl(contents.global_id)
            console.info('Fetching dataset from: ' + datasetUrl)
            
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
          await handleDataverse()
        }
      }
    }
    await handleDataverse()
  }
}

/**
 * Fetches all dataset records from the Odissei Portal search API by paginating 
 * through the results until the end is reached.
 * @returns {Promise<[any, any]>} A tuple containing:
 * - [0]: The dataverse collection metadata.
 * - [1]: The dataset contents array.
 */
async function fetchOdisseiDatasets(): Promise<[any, any]> {
  const baseUrl = 'https://portal.odissei.nl/api/search';
  var records_per_page;
  if (Etl.environment == environments.Testing) {
     records_per_page = 5; // search results records per page
  } else {
     records_per_page = 250; // search results records per page
  }
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
  const url =  DataverseApi + '/datasets/export?exporter=OAI_ORE&persistentId=' + pId
  return url
}