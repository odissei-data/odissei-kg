import { Etl, environments, Iri } from "@triplyetl/etl/generic";
// Declare prefixes.
const prefix_base = Iri("https://w3id.org/odissei/ns/kg/");
const prefix = {
  graph: prefix_base.concat("graph/"),
  odissei_kg_schema: prefix_base.concat("schema/"),
  //codelib: declarePrefix(prefix_base('cbs_codelib/')),
  cbs_project: prefix_base.concat("cbs/project/"),
  //doi: declarePrefix('https://doi.org/'),
  //orcid: declarePrefix('https://orcid.org/'),
  //issn: declarePrefix('https://portal.issn.org/resource/ISSN/')
};

const destination = {
  defaultGraph: prefix.graph.concat("codelib/cbs"),
  account: process.env.USER ?? "odissei",
  dataset:
    Etl.environment === environments.Production
      ? "odissei"
      : "odissei-acceptance",
};

export default async function (): Promise<Etl> {
  const etl = new Etl(destination);
  const account = await etl.triplyDb.getAccount(destination.account);
  const dataset = await account.getDataset(destination.dataset);
  for await (const service of dataset.getServices()) {
    await service.update();
  }
  return etl;
}
