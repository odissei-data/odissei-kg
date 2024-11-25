// Import middlewares and other required libraries............................
import { Etl, Iri } from "@triplyetl/etl/generic";
import { environments } from "@triplyetl/etl/generic";

// Declare prefixes.
const prefix_base = Iri("https://w3id.org/odissei/ns/kg/");
export const prefix = {
  graph: prefix_base.concat("graph/"),
  odissei_kg_schema: prefix_base.concat("schema/"),
  cbs_project: prefix_base.concat("cbs/project/"),
  cbs_dataset: prefix_base.concat("cbs/dataset/"),
  doi: Iri("https://doi.org/"),
};

export const destination = {
  defaultGraph: prefix.graph.concat("default"),
  account: process.env.USER ?? "odissei",
  prefixes: prefix,
  opts: { synchronizeServices: false },
  dataset:
    Etl.environment === environments.Production
      ? "odissei-kg"
      : "odissei-kg-acceptance",
};
