import { logQuads } from '@triplyetl/etl/debug'
import { Etl, loadRdf, Source, toTriplyDb } from '@triplyetl/etl/generic'
import { construct } from '@triplyetl/etl/sparql'
import { destination, prefix } from "./utils/odissei_kg_utils.js";
import dataverse from './etlDataverse.js';

var my_destination: any = destination;
my_destination.defaultGraph = prefix.graph.concat('dataverse_vu');

export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination)
  etl.use(
    dataverse(),
    loadRdf(Source.TriplyDb.query(destination.account, 'dataverse_vu')),
    toTriplyDb(my_destination)
  )
  return etl
}