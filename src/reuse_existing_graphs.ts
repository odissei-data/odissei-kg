import { Etl, Source, Destination } from "@triplyetl/etl/generic";
import { destination } from "./utils/odissei_kg_utils.js";

const jobs = [ {source_location: 'https://www.dublincore.org/specifications/bibo/bibo/bibo.ttl', destination_graph: 'https://www.dublincore.org/specifications/bibo/'}]

export default async function (): Promise<Etl> {
  const etl = new Etl(destination);
  const account = destination.account;
  const dataset = destination.dataset;
  for (const j of jobs) { 
    await etl.copySource(
        Source.url(j.source_location),
        Destination.triplyDb({
          account: account,
          dataset: dataset,
          opts: { defaultGraph: j.destination_graph, synchronizeServices: false }
        })
    )}
  return etl;
}
