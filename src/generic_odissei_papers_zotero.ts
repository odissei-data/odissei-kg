// Import middlewares and other required libraries............................
import { Etl, Source } from "@triplyetl/etl/generic";
import { fromCsv, when, toTriplyDb } from "@triplyetl/etl/generic";
import { addIri, iri, literal, pairs, str, triple } from "@triplyetl/etl/ratt";
import { bibo, a, dct, sdo, xsd } from "@triplyetl/etl/vocab"; // dct
import { destination, prefix } from "./utils/odissei_kg_utils.js";

var my_destination: any = destination;
my_destination.defaultGraph = prefix.graph.concat("papers_funded_by_odissei_sshoc_nl");

const cbs_zotero_bib =
  "https://github.com/odissei-data/odissei-kg/raw/refs/heads/acceptance/static/2025-08-21_ODISSEI_Scientific%20outputs.csv";

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
          prefix: prefix.zotero,
          content: "Key",
          key: "_zotero_key",
        }),
        pairs(
          "_IRI",
          [
            iri(prefix.odissei_kg_schema, str("zotero_key")),
            "_zotero_key",
          ],
          [sdo.producer, "_zotero_key"],
        ),
      ),
      when("Title", triple("_IRI", dct.title, "Title")),
      when("Url", triple("_IRI", dct.identifier, iri("Url"))),
      //when("ShortTitle", triple("_IRI", bibo.shortTitle, "ShortTitle")),
      //when("Date Added", triple("_IRI", sdo.dateCreated, 'Date Added')),
      //when("Date Modified", triple("_IRI", sdo.dateModified, 'Date Modified')),
      //when("Date Added", triple("_IRI", sdo.dateCreated, literal('Date Added', xsd.date))),
      //when("Date Modified", triple("_IRI", sdo.dateModified, literal('Date Modified', xsd.dateTimeStamp))),
      when("Item Type", triple("_IRI", dct.type, "Item Type")),
      when("Publication Year", triple("_IRI", dct.date, literal('Publication Year', xsd.gYear))),
      when("Author", triple("_IRI", sdo.author, "Author")),
      when("Publication Title", triple("_IRI", dct.alternative, "Publication Title")),
      when("Manual Tags", triple("_IRI", dct.subject , "Manual Tags")), //A resource's main topic or content. The tag itself would be the object of the triple.
    ),
    //validate(Source.file('static/model.trig'), {terminateOn:"Violation"}),
    toTriplyDb(my_destination),
  );
  return etl;
}
