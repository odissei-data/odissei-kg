// Import middlewares and other required libraries............................
import { Etl, Source, whenNotEqual } from "@triplyetl/etl/generic";
import { when, toTriplyDb } from "@triplyetl/etl/generic";
import { fromCsv } from "@triplyetl/etl/generic";
import { addIri, iri, iris, pairs, triple } from "@triplyetl/etl/ratt";
import { split, str } from "@triplyetl/etl/ratt";
import { logRecord } from "@triplyetl/etl/debug";
import { validate } from '@triplyetl/etl/shacl'
import { a, dct, dcm, sdo } from "@triplyetl/etl/vocab"; // dct
import { destination, prefix } from "./utils/odissei_kg_utils.js";

// const cbs_codelib = 'https://raw.githubusercontent.com/odissei-data/ODISSEI-code-library/main/Data/odissei-projects_CBS.csv'
// const cbs_codelib = "https://github.com/odissei-data/ODISSEI-code-library/raw/refs/heads/main/data-prep/data/odissei-projects_CBS.csv";
const cbs_codelib = "https://raw.githubusercontent.com/odissei-data/ODISSEI-code-library/main/_data/cbs.csv";

const codemeta = {
  referencePublication: prefix.codemeta.concat("referencePublication")
}

//https://w3id.org/software-iodata#producesData
const sftio = {
  producesData: prefix.sftio.concat("producesData")
}

var my_destination: any = destination;
my_destination.defaultGraph = prefix.graph.concat("codelib/cbs");

export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination);

  etl.use(
    fromCsv(Source.url(cbs_codelib)),
    logRecord(),

    when(
      "code",
      addIri({
        // Generate IRI for code, use DOI, OSF or github link in code field
        content: "code",
        key: "_IRI",
      }),
      pairs("_IRI", [a, dcm.Software], [a, sdo.SoftwareSourceCode]),
      when(
        "CBS_project_nr",
        addIri({
          prefix: prefix.cbs_project,
          content: "CBS_project_nr",
          key: "_CBSproject",
        }),
        pairs(
          "_IRI",
          [sdo.producer, "_CBSproject"],
          //[dct.identifier, "_CBSproject"], // for compatibility reasons we use dct:identifier and sdo:producer. 
          // dct.identifier is used to represent the project number also at cbs_projects.ts and cbs_papers_zotero_odissei.ts
        ),
      ),
      when(
        "programming language",
        triple("_IRI", dct.language, "programming language"),
        triple("_IRI", sdo.programmingLanguage, "programming language"),
      ),
      when("title", triple("_IRI", dct.title, "title")),
      when("title", triple("_IRI", sdo.name, "title")),
      when("project_lead", triple("_IRI", sdo.maintainer, "project_lead")),
      whenNotEqual(
        "ODISSEI_grant",
        "NA",
        triple("_IRI", sdo.funding, "ODISSEI_grant"),
      ),
      whenNotEqual(
        "publication",
        "NA",
        triple("_IRI", dct.isReferencedBy, iri("publication")),
        triple("_IRI", codemeta.referencePublication, iri("publication")),
      ),

      when(
        (context) => context.isNotEmpty("orcid"),
        split({
          content: "orcid",
          separator: ",",
          key: "_orcids",
        }),
        triple("_IRI", dct.creator, iris("_orcids")),
        triple("_IRI", sdo.author, iris("_orcids")),
      ),
      when(
        (context) => context.isNotEmpty("data produced"),
        split({
          content: "data produced",
          separator: ";",
          key: "_output_datasets",
        }),
        triple(iris("_output_datasets"), a, dcm.Dataset),
        triple(iris("_output_datasets"), dct.publisher, "_IRI"), // for compatibility reasons we use dct:publisher and sdo:publisher. 
        // To be compatible with data from the following graphs: 
        // https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_type.ttl, https://terms.codata.org/rdmt/, and urn:ddi:int.cessda.elsst:00000000-0000-0000-0000-000000000001:5
        triple("_IRI", sdo.produces, iris("_output_datasets")),
        triple("_IRI", sftio.producesData, iris("_output_datasets")),
      ),
      when("data used", triple("_IRI", dct.requires, "data used")),

    ),
    validate(Source.file('static/model.trig'), {terminateOn:"Violation"}),
    toTriplyDb(my_destination),
  );
  return etl;
}
