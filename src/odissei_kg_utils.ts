// Import middlewares and other required libraries............................
import { Etl, Iri } from "@triplyetl/etl/generic";
import { environments } from "@triplyetl/etl/generic";

// Declare prefixes.
const prefix_base = Iri("https://w3id.org/odissei/ns/kg/");
export const prefix = {
  graph: prefix_base.concat("graph/"),
  odissei_kg_schema: prefix_base.concat("schema/"),
  liss_project: prefix_base.concat("liss/project/"),
};

export const destination = {
  defaultGraph: prefix.graph.concat("codelib/liss"),
  account: process.env.USER ?? "odissei",
  prefixes: prefix,
  opts: { synchronizeServices: false },
  dataset:
    Etl.environment === environments.Production
      ? "odissei"
      : "odissei-acceptance",
};
