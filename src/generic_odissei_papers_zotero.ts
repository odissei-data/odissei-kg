// Import middlewares and other required libraries............................
import { Etl, Source } from "@triplyetl/etl/generic";
import { fromCsv, when, toTriplyDb } from "@triplyetl/etl/generic";
import { addIri, iri, pairs, str, triple } from "@triplyetl/etl/ratt";
import { bibo, a, dct, sdo } from "@triplyetl/etl/vocab"; // dct
import { destination, prefix } from "./utils/odissei_kg_utils.js";

var my_destination: any = destination;
my_destination.defaultGraph = prefix.graph.concat("generic_papers_zotero");

const cbs_zotero_bib =
  "https://github.com/firmao/sshoc-nl-ontology/raw/refs/heads/main/2025-08-21_ODISSEI_Scientific%20outputs.csv";

export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination);

  etl.use(
    //fromXlsx(Source.url(cbs_zotero_bib)),
    fromCsv(Source.url(cbs_zotero_bib)),

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
        "Key",
        addIri({
          prefix: prefix.cbs_project,
          content: "Key",
          key: "_zotero_key",
        }),
        pairs(
          "_IRI",
          [
            iri(prefix.odissei_kg_schema, str("key")),
            "_zotero_key",
          ],
          [sdo.producer, "_zotero_key"],
        ),
      ),
      when("Title", triple("_IRI", dct.title, "Title")),
      //when("ShortTitle", triple("_IRI", bibo.shortTitle, "ShortTitle")),
    ),
    //validate(Source.file('static/model.trig'), {terminateOn:"Violation"}),
    toTriplyDb(my_destination),
  );
  return etl;
}
