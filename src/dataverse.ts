import { Etl, Destination } from '@triplyetl/etl/generic';
import { destination, prefix } from "./utils/odissei_kg_utils.js";
import fromDataVerse from './utils/fromDataVerse.js';

var my_destination = {...destination, defaultGraph: prefix.dataverse};

export default async function (): Promise<Etl> {
  console.info("Ingest dataverse portal from: " + 
    prefix.dataverseAPI + " into named graph: " + my_destination.defaultGraph);
  const etl = new Etl(my_destination);
  etl.use(
    fromDataVerse(Destination.triplyDb({
      account: my_destination.account,
      dataset: my_destination.dataset,
      opts: { defaultGraph: my_destination.defaultGraph, synchronizeServices: false }
    })),
  )
  return etl
}
