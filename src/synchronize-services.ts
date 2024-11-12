import { Etl } from "@triplyetl/etl/generic";
import { destination } from "./utils/odissei_kg_utils.js";

export default async function (): Promise<Etl> {
  const etl = new Etl(destination);
  const account = await etl.triplyDb.getAccount(destination.account);
  const dataset = await account.getDataset(destination.dataset);
  for await (const service of dataset.getServices()) {
    await service.update();
  }
  return etl;
}
