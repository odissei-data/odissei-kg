import { Etl, toTriplyDb, _switch } from '@triplyetl/etl/generic'
import { destination, prefix } from "./utils/odissei_kg_utils.js";
import fromDataVerse from './utils/fromDataVerse.js'
import etlDataverse  from './utils/etlDataverse.js'
import etlDataset    from './utils/etlDataset.js';

var my_destination: any = destination;
my_destination.defaultGraph = prefix.graph.concat('dataverse-staging');

export default async function (): Promise<Etl> {
  console.info("Ingest dataverse portal from: " + 
    prefix.dataverseAPI + " into named graph: " + my_destination.defaultGraph);
  const etl = new Etl(my_destination);
  etl.use(
    fromDataVerse(),
     _switch('type',
       ['dataverse', etlDataverse()],
       ['dataset', etlDataset()]
     ),
    toTriplyDb(my_destination)
  )
  return etl
}
