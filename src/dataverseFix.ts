import { Etl, loadRdf, Source, toTriplyDb } from '@triplyetl/etl/generic'
import { destination, prefix } from "./utils/odissei_kg_utils.js";

var my_destination: any = destination;
my_destination.defaultGraph = prefix.dataverse;

export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination)
  etl.use(
    // Load RDF from the follwing query: https://kg.odissei.nl/odissei/-/queries/Fixing-http-replacing-by-https/4
    loadRdf(Source.TriplyDb.query(destination.account, 'delete-insert-dataverse-fix')),
    toTriplyDb(my_destination)
    //logQuads(),
  )
  return etl
}