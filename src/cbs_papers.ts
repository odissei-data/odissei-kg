// Import middlewares and other required libraries............................
import { Etl, Source } from "@triplyetl/etl/generic";
import { fromXlsx, when, toTriplyDb } from "@triplyetl/etl/generic";
import { addIri, iri, pairs, str, triple } from "@triplyetl/etl/ratt";
import { bibo, a, dct, sdo } from "@triplyetl/etl/vocab"; // dct
import { destination, prefix } from "./utils/odissei_kg_utils.js";

const cbs_zotero_bib =
  "https://docs.google.com/spreadsheets/d/1JDjvKf3sf60e9_8v-ef0IkyCNxA9y0jlLuCBkcbM-fs/export?gid=1386315381";

const my_destination = {
  defaultGraph: prefix.graph.concat("papers"),
  account: destination.account,
  prefixes: destination.prefixes,
  opts: destination.opts,
  dataset: destination.dataset,
};

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
