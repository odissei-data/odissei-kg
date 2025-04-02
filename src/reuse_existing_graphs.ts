// ETL job to load existing RDF data sources into the right named graph
// on the Triply platform.

import { Etl, Source, Destination } from "@triplyetl/etl/generic";
import { destination, prefix } from "./utils/odissei_kg_utils.js";

const jobs = [ 
  // Main schema file, currently a placeholder to be extended: 
  { source_location:   Source.file("./static/odissei.ttl"), 
    destination_graph: 'https://w3id.org/odissei/ns/kg/schema/'
  },
  // Bibliographic Ontology
  { source_location:   Source.url('https://www.dublincore.org/specifications/bibo/bibo/bibo.ttl'), 
    destination_graph: 'https://www.dublincore.org/specifications/bibo/'
  },
  // DCMI Type Vocabulary
  { source_location:   Source.url('https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_type.ttl'),
    destination_graph: 'https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_type.ttl'
  },
  { source_location:   Source.url('https://vocabs.ardc.edu.au/registry/api/resource/downloads/4948/codata_codata-research-data-management-terminology_v001.ttl'),
    destination_graph: 'https://terms.codata.org/rdmt/'
  },
  // W3C SKOS Schema:
  { source_location:   Source.url('https://www.w3.org/TR/skos-reference/skos.rdf'),
    destination_graph: 'https://www.w3.org/TR/skos-reference/skos.rdf'
  },
  // Software types by Maarten & Daniel:
  { // source_location: Source.url('https://softwareunderstanding.github.io/software_types/release/1.0.0/software-types.ttl'),
    source_location: Source.url('https://raw.githubusercontent.com/odissei-data/software_types/refs/heads/main/release/1.0.0/software-types.ttl'),
    destination_graph: 'https://w3id.org/software-types#'
  },
  // NWO Research fields, based on https://www.nwo.nl/en/nwo-research-fields
  // See https://github.com/CLARIAH/tool-discovery/blob/master/schemas/nwo-research-fields.jsonld for details:
  { source_location:    Source.url('https://raw.githubusercontent.com/CLARIAH/tool-discovery/refs/heads/master/schemas/nwo-research-fields.jsonld'),
    destination_graph:  'https://w3id.org/nwo-research-fields#'
  },
  // TRLs, see https://github.com/CLARIAH/tool-discovery/blob/master/schemas/research-technology-readiness-levels.jsonld
  { source_location:    Source.url('https://raw.githubusercontent.com/CLARIAH/tool-discovery/refs/heads/master/schemas/research-technology-readiness-levels.jsonld'),
    destination_graph:  'https://w3id.org/research-technology-readiness-levels#'
  },
  // CLARIAH Tools registry
  { source_location:   Source.url('https://tools.clariah.nl/data.ttl'),
    destination_graph:  'https://tools.clariah.nl/data/'
  },
  // ELSST Thesaurus, v4:
  { source_location: Source.url('https://thesauri.cessda.eu/rest/v1/elsst-4/data?format=text/turtle'),
    destination_graph: 'urn:ddi:int.cessda.elsst:00000000-0000-0000-0000-000000000001:4'
  },
  // CBS Variable thesaurus, home made with https://github.com/odissei-data/cbs-variables-thesaurus
  { source_location: Source.TriplyDb.asset(destination.account, destination.dataset, {name: 'cbs-variables-thesaurus.ttl'}),
    destination_graph: 'https://w3id.org/odissei/cv/cbs/variableThesaurus/'
  },
  // ODISSEI Portal dump, exported from portal.odissei.nl via fuseki and triply asset ....
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
      ).catch(e => { console.error((e as Error).message) })
  }
  return etl;
}
