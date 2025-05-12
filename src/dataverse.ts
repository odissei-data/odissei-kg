import { Etl, toTriplyDb, _switch, Source, fromJson, Destination } from '@triplyetl/etl/generic'
import { destination, prefix } from "./utils/odissei_kg_utils.js";
import fromDataVerse from './utils/fromDataVerse.js'
import etlDataverse  from './utils/etlDataverse.js'
import etlDataset    from './utils/etlDataset.js';

//var my_destination = {...destination, defaultGraph: prefix.graph.concat('dataverse-staging')};
var my_destination = {...destination, defaultGraph: prefix.dataverse};

export default async function (): Promise<Etl> {
  console.info("Ingest dataverse portal from: " + 
    prefix.dataverseAPI + " into named graph: " + my_destination.defaultGraph);
  const etl = new Etl(my_destination);
  etl.use(
    //fromJson(Source.file('./static/dataverseTest.jsonld')),
    fromDataVerse(Destination.triplyDb({
      account: my_destination.account,
      dataset: my_destination.dataset,
      opts: { defaultGraph: my_destination.defaultGraph, synchronizeServices: false }
    })),
    //  _switch('type',
    //    ['dataverse', etlDataverse()],
    //    ['dataset', []]
    //  ),
    // toTriplyDb(my_destination)
  )
  return etl
}
