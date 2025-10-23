// Import middlewares and other required libraries............................
import { Etl, Source } from "@triplyetl/etl/generic";
import { fromXlsx, when, toTriplyDb } from "@triplyetl/etl/generic";
import { addIri, iri, pairs, str, triple } from "@triplyetl/etl/ratt";
import { bibo, a, dct, sdo } from "@triplyetl/etl/vocab"; // dct
import { destination, prefix } from "./utils/odissei_kg_utils.js";

var my_destination: any = destination;

// Input for this ETL is a google docs/excel spreadsheet, this sheet has been exported from a manually
// maintained collections of papers in Zotero by the ODISSEI CT:
const cbs_zotero_bib =
  "https://docs.google.com/spreadsheets/d/1JDjvKf3sf60e9_8v-ef0IkyCNxA9y0jlLuCBkcbM-fs/export?gid=1386315381";

// For now, we simplify things by only using the papers with a known DOI:
my_destination.defaultGraph = prefix.graph.concat("papers_with_doi");

export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination);

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
        addIri({
          prefix: prefix.cbs_project,
          content: "Projectnumber",
          key: "_CBS_project_number",
        }),
        pairs(
          "_IRI",
          [
            iri(prefix.odissei_kg_schema, str("project")),
            "_CBS_project_number",
          ],
          [sdo.producer, "_CBS_project_number"],
          //[dct.identifier, "_CBS_project_number"], // for compatibility reasons we use dct:identifier and sdo:producer. 
          // dct.identifier is used to represent the project number also at cbs_projects.ts and cbs_codelib.ts
        ),
      ),
      when("Title", triple("_IRI", dct.title, "Title")),
      when("ShortTitle", triple("_IRI", bibo.shortTitle, "ShortTitle")),
    ),
    //validate(Source.file('static/model.trig'), {terminateOn:"Violation"}),
    toTriplyDb(my_destination),
  );
  return etl;
}
