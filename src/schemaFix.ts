import { logQuads } from '@triplyetl/etl/debug'
import { Etl, loadRdf, Source, toTriplyDb } from '@triplyetl/etl/generic'
import { construct } from '@triplyetl/etl/sparql'
import { destination, prefix } from "./utils/odissei_kg_utils.js";

var my_destination: any = destination;
my_destination.defaultGraph = prefix.graph.concat('schemaFix');

export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination)
  etl.use(
    //loadRdf(Source.TriplyDb.rdf(destination.account, destination.dataset)),
    loadRdf(Source.TriplyDb.query(destination.account, 'Fixing-http-replacing-by-https')),
    toTriplyDb(my_destination)
    //logQuads(),
  )
  return etl
}