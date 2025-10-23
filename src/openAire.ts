// Import middlewares and other required libraries............................
import { Etl, Source, whenNotEqual } from "@triplyetl/etl/generic";
import { when, toTriplyDb } from "@triplyetl/etl/generic";
import { fromCsv } from "@triplyetl/etl/generic";
import { addIri, iri, iris, pairs, triple } from "@triplyetl/etl/ratt";
import { split, str } from "@triplyetl/etl/ratt";
import { logRecord } from "@triplyetl/etl/debug";
import { validate } from '@triplyetl/etl/shacl'
import { bibo, a, dct, dcm, sdo } from "@triplyetl/etl/vocab"; // dct
import { destination, prefix } from "./utils/odissei_kg_utils.js";

//const open_aire = "https://services.openaire.eu/search/v2/api/reports?format=csv&fq=foslabel%20exact%20%2205%20social%20sciences%7C%7Csocial%20sciences%22&fq=communityId%20exact%20%22netherlands%22&type=publications";
//const open_aire = "https://services.openaire.eu/search/v2/api/reports?format=csv&fq=resultacceptanceyear%20within%20%222025%202025%22&fq=foslabel%20exact%20%2205%20social%20sciences%7C%7Csocial%20sciences%22&fq=communityId%20exact%20%22netherlands%22&type=publications";
const open_aire = "https://tinyurl.com/nada123x";

var my_destination: any = destination;
my_destination.defaultGraph = prefix.graph.concat("openaire");

export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination);

  etl.use(
    fromCsv(Source.url(open_aire)),
    logRecord(),

     when(
      ( context => context.isNotEmpty("DOI") && context.getString('DOI').indexOf('%') < 1),
      //triple("DOI", a, bibo.Article),
      when(
        "DOI",
        addIri({
        // Generate IRI for article, use DOI for now
        prefix: prefix.doi,
        content: "DOI",
        key: "_IRI",
      }),
      triple("_IRI", a, bibo.AcademicArticle),
      ),
      when("Download From", triple("_IRI", sdo.producer, iri("Download From"))),
      when("Title", triple("_IRI", dct.title, "Title")),
      when("Title", triple("_IRI", sdo.name, "Title")),
      when("Authors", triple("_IRI", sdo.author, "Authors")),
    ),
    validate(Source.file('static/model.trig'), {terminateOn:"Violation"}),
    toTriplyDb(my_destination),
  );
  return etl;
}
