// Import middlewares and other required libraries............................
import { Etl, Source, Iri, when, whenNotEqual } from "@triplyetl/etl/generic";
import { environments, toTriplyDb, fromCsv } from "@triplyetl/etl/generic";
import { addIri, iri, iris, split, triple } from "@triplyetl/etl/ratt";
import { logRecord } from "@triplyetl/etl/debug";
import { a, dcm, dct, sdo } from "@triplyetl/etl/vocab"; // dct

// Declare prefixes.
const prefix_base = Iri("https://w3id.org/odissei/ns/kg/");
const prefix = {
  graph: prefix_base.concat("graph/"),
  odissei_kg_schema: prefix_base.concat("schema/"),
  liss_project: prefix_base.concat("liss/project/"),
};

const liss_codelib =
  "https://github.com/odissei-data/ODISSEI-code-library/raw/refs/heads/main/data-prep/data/odissei-projects_LISS.csv";

const destination = {
  defaultGraph: prefix.graph.concat("codelib/liss"),
  account: process.env.USER ?? "odissei",
  prefixes: prefix,
  dataset:
    Etl.environment === environments.Acceptance
      ? "odissei-acceptance"
      : Etl.environment === environments.Testing
        ? "odissei-acceptance"
        : "odissei",
};

export default async function (): Promise<Etl> {
  const etl = new Etl(destination);

  etl.use(
    fromCsv(Source.url(liss_codelib)),
    logRecord(),

    when(
      "code",
      addIri({
        // Generate IRI for article, use DOI, OSF or github link in code field
        content: "code",
        key: "_IRI",
      }),
      triple("_IRI", a, dcm.Software),
      when("title", triple("_IRI", dct.title, "title")),
      when("project_lead", triple("_IRI", dct.contributor, "project_lead")),
      when(
        (context) => context.isNotEmpty("orcid"),
        split({
          content: "orcid",
          separator: ",",
          key: "_orcids",
        }),
        triple("_IRI", dct.creator, iris("_orcids")),
      ),
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
      when("data_link", triple("_IRI", dct.requires, iri("data_link"))),
      when(
        "programming language",
        triple("_IRI", dct.language, "programming language"),
      ),
    ),
    //validate(Source.file('static/model.trig'), {terminateOn:"Violation"}),
    toTriplyDb(destination),
  );
  return etl;
}
