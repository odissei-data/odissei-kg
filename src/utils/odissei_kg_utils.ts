// Import middlewares and other required libraries............................
import { Etl, Iri } from "@triplyetl/etl/generic";
import { environments } from "@triplyetl/etl/generic";
import { type Context, declarePrefix } from '@triplyetl/etl/generic'

// Declare prefixes.
const prefix_base = Iri("https://w3id.org/odissei/ns/kg/");
const dataverse_base = Iri('https://portal.staging.odissei.nl/');
//   const dataverse_base = Iri('https://portal.odissei.nl/');
export const prefix = {
  graph: prefix_base.concat("graph/"),
  dsv: declarePrefix('https://w3id.org/dsv-ontology#'),
  odissei_kg_schema: prefix_base.concat("schema/"),
  cbs_project: prefix_base.concat("cbs/project/"),
  cbs_dataset: prefix_base.concat("cbs/dataset/"),
  doi: Iri("https://doi.org/"),
  codemeta: Iri('https://codemeta.github.io/terms/'),
  sftio: Iri('https://w3id.org/software-iodata#'),
  dataverseUrl: dataverse_base.concat('dataverse/'),
  dataverse: dataverse_base,
  //dataverseUrl: Iri('https://portal.odissei.nl/dataverse/'),
  dataverseAPI: dataverse_base.concat('api'),
  dataverseGraph: prefix_base.concat("dataverse/")
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

export default function literalStringOrHtml(lexicalFormKey: string) {
  return (ctx: Context) => {
    const description = ctx.getString(lexicalFormKey)
    const dataType = /<[a-z][\s\S]*>/i.test(description)
      ? declarePrefix('http://www.w3.org/1999/02/22-rdf-syntax-ns#').concat('HTML')
      : undefined

    return [ctx.store.literal(description, dataType)]
  }
}