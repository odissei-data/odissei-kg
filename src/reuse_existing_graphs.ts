// ETL job to load existing RDF data sources into the right named graph
// on the Triply platform.

import { Etl, Source, Destination } from "@triplyetl/etl/generic";
import { destination } from "./utils/odissei_kg_utils.js";

const jobs = [ 
  { source_location:   Source.url('https://www.dublincore.org/specifications/bibo/bibo/bibo.ttl'), 
    destination_graph: 'https://www.dublincore.org/specifications/bibo/'
  },
  { source_location:   Source.url('https://vocabs.ardc.edu.au/registry/api/resource/downloads/4948/codata_codata-research-data-management-terminology_v001.ttl'),
    destination_graph: 'https://terms.codata.org/rdmt/'
  },
  { source_location:   Source.url('https://www.w3.org/TR/skos-reference/skos.rdf'),
    destination_graph: 'https://www.w3.org/TR/skos-reference/skos.rdf'
  },
  { source_location: Source.TriplyDb.asset(destination.account, destination.dataset, {name: 'cbs-variables-thesaurus.ttl'}),
    destination_graph: 'https://w3id.org/odissei/cv/cbs/variableThesaurus/'
  },
  { source_location:   Source.url('https://fuseki.devstack.odissei.nl/odissei/'),
    destination_graph: 'https://fuseki.devstack.odissei.nl/odissei/'
  }
  ]

export default async function (): Promise<Etl> {
  const etl = new Etl(destination);
  for (const j of jobs) { 
    console.log(j.destination_graph),
    await etl.copySource(
        j.source_location,
        Destination.triplyDb({
          account: destination.account,
          dataset: destination.dataset,
          opts: { defaultGraph: j.destination_graph, synchronizeServices: false }
        })
    )}
  return etl;
}
