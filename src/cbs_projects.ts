// Import middlewares and other required libraries............................
import { Etl, Source, when } from "@triplyetl/etl/generic";
import { toTriplyDb, fromXlsx } from "@triplyetl/etl/generic";
import { addHashedIri, addIri, iri, str, triple } from "@triplyetl/etl/ratt";
import { translateSome } from "@triplyetl/etl/ratt";
import { a, dct, sdo } from "@triplyetl/etl/vocab";
import { destination, prefix } from "./utils/odissei_kg_utils.js";
import { ror_table } from './utils/ror_table.js';
import { logRecord } from "@triplyetl/etl/debug";

// ETL input data: spreadsheets with CBS project information taken from HTML overview page at:
// https://www.cbs.nl/nl-nl/onze-diensten/maatwerk-en-microdata/microdata-zelf-onderzoek-doen/instellingen-en-projecten
const cbs_projects_before =
  "https://www.cbs.nl/-/media/cbs-op-maat/zelf-onderzoek-doen/projecten_met_bestanden_einddatum_voor_2024.xlsx";
const cbs_projects_after =
  "https://www.cbs.nl/-/media/cbs-op-maat/zelf-onderzoek-doen/projecten_met_bestanden_einddatum_na_2023.xlsx";

  var my_destination: any = destination;
  my_destination.defaultGraph = prefix.graph.concat("projects");

export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination);
 
  etl.use(
    fromXlsx(
      [
        Source.url(cbs_projects_before),
        Source.TriplyDb.asset(destination.account, destination.dataset, {
          name: "projecten_met_bestanden_einddatum_na_2023.xlsx",
        }),
      ],
      { groupColumnsByName: false },
    ),
    logRecord(),
    when(
      "Projectnummer",
      addIri({
        // Generate IRI for CBS project, use ODISSEI namespace for now
        content: "Projectnummer",
        prefix: prefix.cbs_project,
        key: "_IRI",
      }),
      triple("_IRI", a, sdo.ResearchProject),
      when(
        "Bestandsnaam",
        addHashedIri({
          prefix: prefix.cbs_dataset,
          content: ["Bestandsnaam"],
          key: "_bestandsnaamHash",
        }),
        triple("_IRI", dct.requires, "_bestandsnaamHash"),
        triple("_bestandsnaamHash", dct.alternative, "Bestandsnaam"),
      ),
      translateSome({
        content: 'Instelling',
        table: ror_table,
        key: '_institute'
      }),
      triple('_IRI', sdo.parentOrganization, '_institute'),
      triple(
        "_IRI",
        iri(prefix.odissei_kg_schema, str("instelling")),
        "Instelling",
      ),
      when("Onderzoek", triple("_IRI", dct.title, "Onderzoek")),
      when("Startdatum", triple("_IRI", sdo.startDate, "Startdatum")),
      when("Einddatum", triple("_IRI", sdo.endDate, "Einddatum")),
    ),
    toTriplyDb(my_destination),
  );
  return etl;
}
