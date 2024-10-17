// Import middlewares and other required libraries.
import { declarePrefix, environments, Etl, fromCsv, Source, toTriplyDb } from "@triplyetl/etl/generic";
import { concat, pairs, iri, literal, split } from "@triplyetl/etl/ratt";
import { validate } from "@triplyetl/etl/shacl";

// Import vocabularies.
import { a, foaf, owl, xsd } from "@triplyetl/etl/vocab";

// Declare the base for all Iri's:
const baseIri = declarePrefix("https://example.org/");

const destination = {
  account: Etl.environment === environments.Development ? "me" : "odissei",
  dataset:
    Etl.environment === environments.Acceptance
      ? "odissei-acceptance"
      : Etl.environment === environments.Testing
        ? "odissei-testing"
        : "odissei",
};

export default async function (): Promise<Etl> {
  // Create an extract-transform-load (ETL) process.
  const etl = new Etl({ baseIri });
  etl.use(
    // Connect to one or more data sources.
    fromCsv(Source.file("static/people.csv")),

    // Transformations change data in the Record.
    concat({
      content: ["firstName", "lastName"],
      separator: " ",
      key: "fullName",
    }),

    split({
      content: "firstName",
      key: "names",
      separator: " ",
    }),

    // Assertions add linked data to the RDF store.
    pairs(
      iri(etl.standardPrefixes.id, "$recordId"),
      [a, foaf.Person],
      [foaf.firstName, "names"],
      [foaf.lastName, "lastName"],
      [foaf.name, "fullName"],
      [foaf.birthday, literal("birthday", xsd.date)],
      [owl.sameAs, iri("WikiPage")],
      [foaf.depiction, iri("image")],
    ),

    // Validation ensures that your instance data follows the data model.
    validate(Source.file("static/model.trig")),

    // Publish your data in TriplyDB.
    toTriplyDb(destination),
  );
  return etl;
}
