// Import middlewares and other required libraries............................
import { Etl, Source, when, whenNotEqual } from "@triplyetl/etl/generic";
import { toTriplyDb, fromCsv } from "@triplyetl/etl/generic";
import { addIri, iri, iris, split, triple } from "@triplyetl/etl/ratt";
import { logRecord } from "@triplyetl/etl/debug";
import { a, dcm, dct, sdo } from "@triplyetl/etl/vocab"; // dct
import { destination, prefix } from "./utils/odissei_kg_utils.js";

const liss_codelib = "https://raw.githubusercontent.com/odissei-data/ODISSEI-code-library/main/_data/liss.csv";

var my_destination: any = destination;
my_destination.defaultGraph = prefix.graph.concat("codelib/liss");

export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination);

  etl.use(
    fromCsv(Source.url(liss_codelib)),
    logRecord(),

    when(
      "code",
      addIri({
        // Generate IRI for the article, use DOI, OSF or github link in code field
        content: "code",
        key: "_IRI",
      }),
      triple("_IRI", a, dcm.Software),
      triple("_IRI", a, sdo.SoftwareSourceCode),

      when("title", triple("_IRI", dct.title, "title")),
      when("project_lead", triple("_IRI", dct.contributor, "project_lead")),
      when(
        (context) => context.isNotEmpty("orcid"),
        split({
          content: "orcid",
          separator: ";",
          key: "_orcids",
        }),
        triple("_IRI", sdo.author, iris("_orcids")),
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
      //when("link_data", triple("_IRI", dct.requires, iri("link_data"))),
      when(
        (context) => context.isNotEmpty("link_data"),
        split({
          content: "link_data",
          separator: ";",
          key: "_link_datas",
        }),
        triple("_IRI", dct.requires, iris("_link_datas")),
      ),

      when(
        "programming language",
        triple("_IRI", dct.language, "programming language"),
      ),
    ),
    //validate(Source.file('static/model.trig'), {terminateOn:"Violation"}),
    toTriplyDb(my_destination),
  );
  return etl;
}
