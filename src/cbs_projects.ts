// Import middlewares and other required libraries............................
import { Etl, Source, when } from "@triplyetl/etl/generic";
import { toTriplyDb, fromXlsx } from "@triplyetl/etl/generic";
import { addHashedIri, addIri, iri, str, triple } from "@triplyetl/etl/ratt";
import { translateSome } from "@triplyetl/etl/ratt";
import { a, dct, sdo, skosxl } from "@triplyetl/etl/vocab";
import { destination, prefix } from "./utils/odissei_kg_utils.js";
import { ror_table } from './utils/ror_table.js';
import { logRecord } from "@triplyetl/etl/debug";

// ETL input data: spreadsheets with CBS project information taken from HTML overview page at:
// https://www.cbs.nl/nl-nl/onze-diensten/maatwerk-en-microdata/microdata-zelf-onderzoek-doen/instellingen-en-projecten
const cbs_projects_after =
  "https://www.cbs.nl/-/media/cbs-op-maat/zelf-onderzoek-doen/projects_with_datasets_after_2025.xlsx";
const cbs_projects_before =
  "https://www.cbs.nl/-/media/cbs-op-maat/zelf-onderzoek-doen/projects_with_datasets_before_2026_.xlsx";  

//const cbs_projects_after =
//  "https://www.cbs.nl/-/media/cbs-op-maat/zelf-onderzoek-doen/projecten_met_bestanden_einddatum_na_2024_.xlsx";
//const cbs_projects_before =
//  "https://www.cbs.nl/-/media/cbs-op-maat/zelf-onderzoek-doen/projecten_met_bestanden_einddatum_voor_2025_.xlsx";   

  var my_destination: any = destination;
  my_destination.defaultGraph = prefix.graph.concat("projects");

export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination);
 
  etl.use(
    fromXlsx(
      [
        Source.url(cbs_projects_before),
        Source.url(cbs_projects_after),
        //Source.TriplyDb.asset(destination.account, destination.dataset, {
        //  name: "projecten_met_bestanden_einddatum_na_2023.xlsx",
        //}),
      ],
      { groupColumnsByName: false },
    ),
    logRecord(),
    when(
      "Project",
      addIri({
        // Generate IRI for CBS project, use ODISSEI namespace for now
        content: "Project",
        prefix: prefix.cbs_project,
        key: "_IRI",
      }),
      triple("_IRI", a, sdo.ResearchProject),
      //triple("_IRI", a, dct.identifier), // for compatibility reasons we use dct:identifier to represent the project number as an identifier. 
      // dct.identifier is used to represent the project number also at cbs_codelib.ts and cbs_papers_zotero_odissei.ts
      when(
        "Dataset",
        addHashedIri({
          prefix: prefix.cbs_dataset,
          content: ["Dataset"],
          key: "_bestandsnaamHash",
        }),
        triple("_IRI", dct.requires, "_bestandsnaamHash"),
        triple("_bestandsnaamHash", dct.alternative, "Dataset"),
        //triple("_bestandsnaamHash", skosxl.altLabel, "Bestandsnaam"),
        /* While dcterms:alternative is a general-purpose property, 
        skos:altLabel is the better choice because it is specifically 
        designed and widely adopted for representing alternative human-readable labels in knowledge organization systems. */
      ),
      translateSome({
        content: 'Institution',
        table: ror_table,
        key: '_institute'
      }),
      triple('_IRI', sdo.parentOrganization, '_institute'),
      triple(
        "_IRI",
        iri(prefix.odissei_kg_schema, str("Institution")),
        "Institution",
      ),
      when("Project title", triple("_IRI", dct.title, "Project title")),
      when("Start date", triple("_IRI", sdo.startDate, "Start date")),
      when("End date", triple("_IRI", sdo.endDate, "End date")),
    ),
    toTriplyDb(my_destination),
  );
  return etl;
}
