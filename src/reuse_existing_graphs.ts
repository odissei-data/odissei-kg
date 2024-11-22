import { Etl, Source, Destination } from "@triplyetl/etl/generic";
import { destination } from "./utils/odissei_kg_utils.js";

const jobs = [ 
  { source_location:   'https://www.dublincore.org/specifications/bibo/bibo/bibo.ttl', 
    destination_graph: 'https://www.dublincore.org/specifications/bibo/'
  },
  { source_location:   'https://vocabs.ardc.edu.au/registry/api/resource/downloads/4948/codata_codata-research-data-management-terminology_v001.ttl',
    destination_graph: 'https://terms.codata.org/rdmt/'
  },
  { source_location:   'https://www.w3.org/TR/skos-reference/skos.rdf',
    destination_graph: 'https://www.w3.org/TR/skos-reference/skos.rdf'
  },
  { source_location:   'https://fuseki.devstack.odissei.nl/odissei/',
    destination_graph: 'https://fuseki.devstack.odissei.nl/odissei/'
  }
  ]

export default async function (): Promise<Etl> {
  const etl = new Etl(destination);
  for (const j of jobs) { 
    await etl.copySource(
        Source.url(j.source_location),
        Destination.triplyDb({
          account: destination.account,
          dataset: destination.dataset,
          opts: { defaultGraph: j.destination_graph, synchronizeServices: false }
        })
    )}
  return etl;
}
