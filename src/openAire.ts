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

const open_aire = "https://services.openaire.eu/search/v2/api/reports?format=csv&fq=foslabel%20exact%20%2205%20social%20sciences%7C%7Csocial%20sciences%22&fq=communityId%20exact%20%22netherlands%22&type=publications";

var my_destination: any = destination;
my_destination.defaultGraph = prefix.graph.concat("openaire");

export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination);

  etl.use(
    fromCsv(Source.url(open_aire)),
    logRecord(),

    when(
      ( context => context.isNotEmpty("Download From") && context.getString('Download From').startsWith('http')),
      when(
        "Download From",
        addIri({
          content: "Download From",
          key: "_sourcepublication",
        }),
        pairs(
          "_sourcepublication",
          [sdo.producer, "_sourcepublication"],
          //[dct.identifier, "_CBSproject"], // for compatibility reasons we use dct:identifier and sdo:producer. 
          // dct.identifier is used to represent the project number also at cbs_projects.ts and cbs_papers_zotero_odissei.ts
        ),
      ),

      
      when('Title',  triple('_sourcepublication', dct.title, 'Title')),
    ),
    //validate(Source.file('static/model.trig'), {terminateOn:"Violation"}),
    toTriplyDb(my_destination),
  );
  return etl;
}
