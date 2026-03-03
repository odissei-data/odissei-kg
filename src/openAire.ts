// Import middlewares and other required libraries............................
import { Etl, Source, whenNotEqual } from "@triplyetl/etl/generic";
import { when, toTriplyDb } from "@triplyetl/etl/generic";
import { fromCsv } from "@triplyetl/etl/generic";
import { addIri, iri, iris, pairs, triple } from "@triplyetl/etl/ratt";
import { split, str } from "@triplyetl/etl/ratt";
import { logRecord } from "@triplyetl/etl/debug";
import { validate } from '@triplyetl/etl/shacl'
import { bibo, a, dct, dcm, sdo } from "@triplyetl/etl/vocab"; // dct
import { destination, prefix } from "./utils/odissei_kg_utils.js";

import axios from 'axios';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//const open_aire = "https://services.openaire.eu/search/v2/api/reports?format=csv&fq=resultacceptanceyear%20within%20%222025%202025%22&fq=foslabel%20exact%20%2205%20social%20sciences%7C%7Csocial%20sciences%22&fq=communityId%20exact%20%22netherlands%22&type=publications";
//const open_aire = "https://tinyurl.com/nada123x";
let open_aire = "openaire.csv"; // Local file to avoid "name too long" error with long URL

var my_destination: any = destination;
my_destination.defaultGraph = prefix.graph.concat("openaire");

/**
 * Native TypeScript implementation to extract Social Science data.
 * Limit: 200,035 records.
 */
async function downloadSocialSciencesNetherlands(): Promise<void> {
    const baseUrl = "https://services.openaire.eu/portal-search/researchProducts/fetchCsv";
    const outputFile = path.join(__dirname, open_aire);
    
    const MAX_RECORDS = 200035;
    //const MAX_RECORDS = 20;
    let totalDownloaded = 0;
    const years = Array.from({ length: 2026 - 1980 + 1 }, (_, i) => 2026 - i);
    
    console.log(`Starting limited harvest: Target ${MAX_RECORDS} records.`);

    // Initialize/Clear file
    if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
    }

    let firstWriteEver = true;
    const writeStream = fs.createWriteStream(outputFile, { flags: 'a', encoding: 'utf8' });

    let allResultsText = "";
    try {
        for (const year of years) {
            if (totalDownloaded >= MAX_RECORDS) break;

            console.log(`\n--- Harvesting Year: ${year} ---`);
            let page = 0;
            let hasMoreInYear = true;

            while (hasMoreInYear) {
                const remainingNeeded = MAX_RECORDS - totalDownloaded;
                if (remainingNeeded <= 0) break;

                const fetchSize = Math.min(500, remainingNeeded);

                const params = {
                    fosLabel: '("05 social sciences||social sciences")',
                    relCommunityId: '("netherlands")',
                    fromDateAccepted: `${year}-01-01`,
                    toDateAccepted: `${year}-12-31`,
                    size: fetchSize.toString(),
                    page: page.toString()
                };

                const response = await axios.get(baseUrl, { 
                    params, 
                    responseType: 'text',
                    timeout: 60000 
                });

                let csvText = response.data.trim();
                let lines = csvText.split(/\r?\n/);

                // Stop if no data or only header on subsequent pages
                if (!csvText || (page > 0 && lines.length <= 1)) {
                    hasMoreInYear = false;
                    continue;
                }

                // Strip header for all pages except the very first write
                if (!firstWriteEver) {
                    lines.shift();
                }

                if (lines.length > 0) {
                    const headerOffset = firstWriteEver ? 1 : 0;
                    let actualDataInBatch = lines.length - headerOffset;

                    // Ensure we don't exceed the exact record count
                    if (totalDownloaded + actualDataInBatch > MAX_RECORDS) {
                        const allowedData = MAX_RECORDS - totalDownloaded;
                        lines = lines.slice(0, headerOffset + allowedData);
                        actualDataInBatch = allowedData;
                    }

                    writeStream.write(lines.join('\n') + '\n');
                    //allResultsText += lines.join('\n') + '\n';
                    totalDownloaded += actualDataInBatch;
                    firstWriteEver = false;

                    console.log(`Progress: ${totalDownloaded}/${MAX_RECORDS} records.`);
                }

                // If we got fewer records than requested, we reached the end of the year
                if (lines.length < fetchSize || totalDownloaded >= MAX_RECORDS) {
                    hasMoreInYear = false;
                } else {
                    page++;
                }

                // Rate limiting pause
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    } catch (error: any) {
        console.error(`\n[Error] Harvest failed: ${error.message}`);
    } finally {
        //const resp= await allResultsText;
        //const fs = await import("fs/promises");
        //await fs.writeFile(open_aire, resp);
        writeStream.end();
        open_aire = writeStream.path as string; // Update path in case it was changed
        console.log(`\nStream closed. Final count: ${totalDownloaded} records.`);
    }
}

export default async function (): Promise<Etl> {
  await downloadSocialSciencesNetherlands(); // Call the harvest function to download the CSV data  
   // Download to avoid "name too long" error with long URL
  //const response = await fetch(open_aire);
  //const fs = await import("fs/promises");
  //await fs.writeFile(open_aire, await response.text());
  
  const etl = new Etl(my_destination);
    

  etl.use(
    fromCsv(Source.file(open_aire)),
    //fromCsv(Source.url(open_aire)),
    logRecord(),

    when(
      "Download From",
      addIri({
        // Generate IRI for article, use DOI for now
        //prefix: prefix.doi,
        content: "Download From",
        key: "_IRI",
      }),
      triple("_IRI", a, bibo.AcademicArticle),
      when("Related Organizations", triple("_IRI", sdo.producer, "Related Organizations")),
      when("Title", triple("_IRI", dct.title, "Title")),
      when("Title", triple("_IRI", sdo.name, "Title")),
      when("Authors", triple("_IRI", sdo.author, "Authors")),
    ),
    validate(Source.file('static/model.trig'), {terminateOn:"Violation"}),
    toTriplyDb(my_destination),
  );
  return etl;
}
