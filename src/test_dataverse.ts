import { Etl, Source, toTriplyDb, _switch, when, fromJson } from '@triplyetl/etl/generic'
import { destination, prefix } from "./utils/odissei_kg_utils.js";
import etlDataset    from './utils/etlDataset.js';
import { logRecord } from '@triplyetl/etl/debug';

var my_destination: any = destination;
my_destination.defaultGraph = prefix.graph.concat('dataverse-testrun');

export default async function (): Promise<Etl> {
  console.info("Ingest dataverse portal from: " + 
    prefix.dataverseAPI + " into named graph: " + my_destination.defaultGraph);
  const etl = new Etl(my_destination);
  etl.use(
    fromJson(Source.file('./static/dataverseTest.json')),
    etlDataset(),
    logRecord(),
    toTriplyDb(my_destination)
  )
  return etl
}
