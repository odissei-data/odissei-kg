import { logQuads } from '@triplyetl/etl/debug'
import { Etl, loadRdf, Source, toTriplyDb, _switch } from '@triplyetl/etl/generic'
import { construct } from '@triplyetl/etl/sparql'
import { destination, prefix } from "./utils/odissei_kg_utils.js";
import dataverse from './etlDataverse.js';
import fromApi from './utils/fromDataVerse.js';

// import { validate } from '@triplyetl/etl/shacl'
import fromDataVerse from './utils/fromDataVerse.js'
import etlDataverse from './etlDataverse.js'

var my_destination: any = destination;
my_destination.defaultGraph = prefix.graph.concat('dataverse_vu');

export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination)
  etl.use(
    fromDataVerse(),
    
    // always run below:
    _switch('type',
      ['dataverse', etlDataverse()]
      //['dataset', etlDataset()]
    ),
    loadRdf(Source.TriplyDb.query(destination.account, 'Fixing-http-replacing-by-https')),
    toTriplyDb(my_destination)
  )
  return etl
}