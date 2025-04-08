import { Etl, loadRdf, Source, toTriplyDb, _switch } from '@triplyetl/etl/generic'

import { destination, prefix } from "./utils/odissei_kg_utils.js";
import fromDataVerse from './utils/fromDataVerse.js'
import etlDataverse  from './utils/etlDataverse.js'
import etlDataset    from './utils/etlDataset.js';


var my_destination: any = destination;
my_destination.defaultGraph = prefix.graph.concat('dataverse-staging');

export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination)
  etl.use(
    fromDataVerse(),
    // always run below:
    _switch('type',
      ['dataverse', etlDataverse()],
      ['dataset', etlDataset()]
    ),
    toTriplyDb(my_destination)
  )
  return etl
}
