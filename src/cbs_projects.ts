import {
  Etl,
  Iri,
  Source,
  declarePrefix,
  environments,
  when,
  toTriplyDb,
  fromXlsx,
} from "@triplyetl/etl/generic";
import {
  addHashedIri,
  addIri,
  custom,
  iri,
  str,
  triple,
} from "@triplyetl/etl/ratt";
import { a, dct } from "@triplyetl/etl/vocab";
// import { logRecord } from "@triplyetl/etl/debug";

// Declare prefixes.
const prefix_base = Iri("https://w3id.org/odissei/ns/kg/");
const prefix = {
  graph: prefix_base.concat("graph/"),
  odissei_kg_schema: prefix_base.concat("schema/"),
  cbs_project: prefix_base.concat("cbs/project/"),
  cbs_dataset: prefix_base.concat("cbs/dataset/"),
  cbs_organisation: prefix_base.concat("cbs/organisation/"),
  doi: Iri("https://doi.org/"),
};

// ETL input data: spreadsheets with CBS project information taken from HTML overview page at:
// https://www.cbs.nl/nl-nl/onze-diensten/maatwerk-en-microdata/microdata-zelf-onderzoek-doen/instellingen-en-projecten
const cbs_projects_before =
  "https://www.cbs.nl/-/media/cbs-op-maat/zelf-onderzoek-doen/projecten_met_bestanden_einddatum_voor_2024.xlsx";
const cbs_projects_after =
  "https://www.cbs.nl/-/media/cbs-op-maat/zelf-onderzoek-doen/projecten_met_bestanden_einddatum_na_2023.xlsx";

const destination = {
  defaultGraph: prefix.graph.concat("projects"),
  account: process.env.USER ?? "odissei",
  prefixes: prefix,
  dataset:
    Etl.environment === environments.Acceptance
      ? "odissei-acceptance"
      : Etl.environment === environments.Testing
        ? "odissei-acceptance"
        : "odissei",
};

export default async function (): Promise<Etl> {
  const etl = new Etl(destination);

  etl.use(
    // fromXlsx([Source.url(cbs_projects_after), Source.url(cbs_projects_before)], { sheetNames: ['2024'], groupColumnsByName: true }),
    fromXlsx(
      [
        Source.url(cbs_projects_before),
        Source.TriplyDb.asset(destination.account, destination.dataset, {
          name: "projecten_met_bestanden_einddatum_na_2023.xlsx",
        }),
      ],
      { groupColumnsByName: false },
    ),
    // logRecord(),
    when(
      "Projectnummer",
      addIri({
        // Generate IRI for CBS project, use ODISSEI namespace for now
        content: "Projectnummer",
        prefix: prefix.cbs_project,
        key: "_IRI",
      }),
      triple("_IRI", a, iri(prefix.odissei_kg_schema, str("Project"))),
      when(
        "Bestandsnaam",
        addHashedIri({
          prefix: prefix.cbs_dataset,
          content: ["Bestandsnaam"],
          key: "_bestandsnaamHash",
        }),
        triple(
          "_IRI",
          iri(prefix.odissei_kg_schema, str("bestandsnaam")),
          "_bestandsnaamHash",
        ),
        triple("_bestandsnaamHash", dct.alternative, "Bestandsnaam"),
      ),
      when(
        "Instelling",
        triple(
          "_IRI",
          iri(prefix.odissei_kg_schema, str("instelling")),
          iri(prefix.cbs_organisation, "Instelling"),
        ),
      ),
      when("Onderzoek", triple("_IRI", dct.title, "Onderzoek")),
      when(
        "Startdatum",
        triple(
          "_IRI",
          iri(prefix.odissei_kg_schema, str("startDate")),
          "Startdatum",
        ),
      ),
      when(
        "Einddatum",
        triple(
          "_IRI",
          iri(prefix.odissei_kg_schema, str("endDate")),
          "Einddatum",
        ),
      ),
    ),
    toTriplyDb(destination),
  );
  return etl;
}
