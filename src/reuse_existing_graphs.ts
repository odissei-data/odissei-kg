// ETL job to load existing RDF data sources into the right named graph
// on the Triply platform.

import { Etl, Source, Destination } from "@triplyetl/etl/generic";
import { destination, prefix } from "./utils/odissei_kg_utils.js";

const jobs = [ 
  { source_location:   Source.file("./static/odissei.ttl"), 
    destination_graph: 'https://w3id.org/odissei/ns/kg/schema/'
  },
  { source_location:   Source.url('https://www.dublincore.org/specifications/bibo/bibo/bibo.ttl'), 
    destination_graph: 'https://www.dublincore.org/specifications/bibo/'
  },
  { source_location:   Source.url('https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_type.ttl'),
    destination_graph: 'https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_type.ttl'
  },
  { source_location:   Source.url('https://vocabs.ardc.edu.au/registry/api/resource/downloads/4948/codata_codata-research-data-management-terminology_v001.ttl'),
    destination_graph: 'https://terms.codata.org/rdmt/'
  },
  { source_location:   Source.url('https://www.w3.org/TR/skos-reference/skos.rdf'),
    destination_graph: 'https://www.w3.org/TR/skos-reference/skos.rdf'
  },
  { // FIXME: source should be the original clariah location once they fix the json ld
    // https://raw.githubusercontent.com/CLARIAH/tool-discovery/master/schemas/nwo-research-fields.jsonld
    source_location:    Source.url('https://raw.githubusercontent.com/odissei-data/tool-discovery/refs/heads/master/schemas/nwo-research-fields.jsonld'),
    destination_graph:  'https://w3id.org/nwo-research-fields#'
  },
  { source_location:    Source.url('https://raw.githubusercontent.com/CLARIAH/tool-discovery/refs/heads/master/schemas/research-technology-readiness-levels.jsonld'),
    destination_graph:  'https://w3id.org/research-technology-readiness-levels#'
  },
  { source_location:   Source.url('https://tools.clariah.nl/data.ttl'),
    destination_graph:  'https://tools.clariah.nl/data/'
  },
  { source_location: Source.url('https://thesauri.cessda.eu/rest/v1/elsst-4/data?format=text/turtle'),
    destination_graph: 'urn:ddi:int.cessda.elsst:00000000-0000-0000-0000-000000000001:4'
  },
  { source_location: Source.TriplyDb.asset(destination.account, destination.dataset, {name: 'cbs-variables-thesaurus.ttl'}),
    destination_graph: 'https://w3id.org/odissei/cv/cbs/variableThesaurus/'
  },
  { source_location:   Source.TriplyDb.asset(destination.account, destination.dataset, {name: 'portal-dump.ttl.gz'}),
    destination_graph: 'https://fuseki.devstack.odissei.nl/odissei/'
  }
  ]

export default async function (): Promise<Etl> {
  const etl = new Etl(destination);
  for (const j of jobs) { 
    console.info(j.destination_graph),
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
