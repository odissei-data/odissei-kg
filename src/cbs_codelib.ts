// Import middlewares and other required libraries............................
import { Etl, Source, Iri, whenNotEqual } from "@triplyetl/etl/generic";
import { environments, when, toTriplyDb } from "@triplyetl/etl/generic";
import { fromCsv } from "@triplyetl/etl/generic";
import { addIri, iri, iris, pairs, triple } from "@triplyetl/etl/ratt";
import { split, str } from "@triplyetl/etl/ratt";
import { logRecord } from "@triplyetl/etl/debug";
import { a, dct, dcm, sdo } from "@triplyetl/etl/vocab"; // dct

// Declare prefixes.
const prefix_base = Iri("https://w3id.org/odissei/ns/kg/");
const prefix = {
  graph: prefix_base.concat("graph/"),
  odissei_kg_schema: prefix_base.concat("schema/"),
  //codelib: declarePrefix(prefix_base('cbs_codelib/')),
  cbs_project: prefix_base.concat("cbs/project/"),
  //doi: declarePrefix('https://doi.org/'),
  //orcid: declarePrefix('https://orcid.org/'),
  //issn: declarePrefix('https://portal.issn.org/resource/ISSN/')
};

// const cbs_codelib = 'https://raw.githubusercontent.com/odissei-data/ODISSEI-code-library/main/Data/odissei-projects_CBS.csv'
// const cbs_codelib = "https://raw.githubusercontent.com/odissei-data/ODISSEI-code-library/refs/heads/main/_data/cbs.csv";
const cbs_codelib =
  "https://github.com/odissei-data/ODISSEI-code-library/raw/refs/heads/main/data-prep/data/odissei-projects_CBS.csv";

const destination = {
  defaultGraph: prefix.graph.concat("codelib/cbs"),
  account: process.env.USER ?? "odissei",
  prefixes: prefix,
  dataset:
    Etl.environment === environments.Production
      ? "odissei"
      : "odissei-acceptance",
};

export default async function (): Promise<Etl> {
  const etl = new Etl(destination);
  // const cat_quads =await getRdf("https://mcal.odissei.nl/cv/contentAnalysisType/v0.1/")

  etl.use(
    fromCsv(Source.url(cbs_codelib)),
    logRecord(),

    when(
      "code",
      addIri({
        // Generate IRI for article, use DOI, OSF or github link in code field
        content: "code",
        key: "_IRI",
      }),
      pairs("_IRI", [a, dcm.Software], [a, sdo.CreativeWork]),
      when(
        "CBS_project_nr",
        addIri({
          prefix: prefix.cbs_project,
          content: "CBS_project_nr",
          key: "_CBSproject",
        }),
        pairs(
          "_IRI",
          [iri(prefix.odissei_kg_schema, str("project")), "_CBSproject"],
          [sdo.producer, "_CBSproject"],
        ),
      ),
      when(
        "programming language",
        triple("_IRI", dct.language, "programming language"),
      ),
      when("title", triple("_IRI", dct.title, "title")),
      when("project_lead", triple("_IRI", dct.contributor, "project_lead")),
      whenNotEqual(
        "ODISSEI_grant",
        "NA",
        triple("_IRI", sdo.funding, "ODISSEI_grant"),
      ),
      whenNotEqual(
        "publication",
        "NA",
        triple("_IRI", dct.isReferencedBy, iri("publication")),
      ),

      when(
        (context) => context.isNotEmpty("orcid"),
        split({
          content: "orcid",
          separator: ",",
          key: "_orcids",
        }),
        triple("_IRI", dct.creator, iris("_orcids")),
      ),
    ),
    //validate(Source.file('static/model.trig'), {terminateOn:"Violation"}),
    toTriplyDb(destination),
  );
  return etl;
}
