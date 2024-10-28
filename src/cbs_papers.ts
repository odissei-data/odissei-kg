import {
  Etl,
  Source,
  Iri,
  environments,
  fromXlsx,
  when,
  toTriplyDb,
} from "@triplyetl/etl/generic";
import { addIri, iri, str, triple } from "@triplyetl/etl/ratt";
import { bibo, a, dct } from "@triplyetl/etl/vocab"; // dct

// Declare prefixes.
const prefix_base = Iri("https://w3id.org/odissei/ns/kg/");
const prefix = {
  graph: prefix_base.concat("graph/"),
  odissei_kg_schema: prefix_base.concat("schema/"),
  cbs_project: prefix_base.concat("cbs/project/"),
  doi: Iri("https://doi.org/"),
};

const cbs_zotero_bib =
  "https://docs.google.com/spreadsheets/d/1JDjvKf3sf60e9_8v-ef0IkyCNxA9y0jlLuCBkcbM-fs/export?gid=1386315381";

const destination = {
  defaultGraph: prefix.graph.concat("papers"),
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
    fromXlsx(Source.url(cbs_zotero_bib)),

    when(
      "DOI",
      addIri({
        // Generate IRI for article, use DOI for now
        prefix: prefix.doi,
        content: "DOI",
        key: "_IRI",
      }),
      triple("_IRI", a, bibo.AcademicArticle),
      when(
        "Projectnumber",
        triple(
          "_IRI",
          iri(prefix.odissei_kg_schema, str("project")),
          iri(prefix.cbs_project, "Projectnumber"),
        ),
      ),
      when("Title", triple("_IRI", dct.title, "Title")),
      when("ShortTitle", triple("_IRI", bibo.shortTitle, "ShortTitle")),
    ),
    //validate(Source.file('static/model.trig'), {terminateOn:"Violation"}),
    toTriplyDb(destination),
  );
  return etl;
}
