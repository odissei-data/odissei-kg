// Import middlewares and other required libraries............................
import { Etl, Source } from "@triplyetl/etl/generic";
import { fromXlsx, when, toTriplyDb } from "@triplyetl/etl/generic";
import { addIri, literal, triple } from "@triplyetl/etl/ratt";
import { translateSome } from "@triplyetl/etl/ratt";
import { bibo, a, dct, sdo, xsd } from "@triplyetl/etl/vocab"; // dct
import { destination, prefix } from "./utils/odissei_kg_utils.js";
import { ror_table } from './utils/ror_table.js';
import { logRecord } from "@triplyetl/etl/debug";

var my_destination: any = destination;
my_destination.defaultGraph = prefix.graph.concat("cbs_publications");

const year_pattern = new RegExp('^[0-9][0-9][0-9][0-9]$'); 

//const cbs_publications =
//  "https://www.cbs.nl/-/media/cbs-op-maat/microdatabestanden/documents/2023/33/publicatie_overzicht_internet_augustus_2023.xlsx";
// const cbs_publications = "https://www.cbs.nl/-/media/cbs-op-maat/zelf-onderzoek-doen/publication_overview_internet_january_26.xlsx";
const cbs_publications = "https://www.cbs.nl/-/media/cbs-op-maat/zelf-onderzoek-doen/publicatie_overzicht_internet.xlsx"

function isValidUrl(value: string): boolean {
  try {
    new URL(value); // Requires an absolute URL, including its scheme
    return true;
  } catch {
    return false;
  }
}
export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination);

  etl.use(
    fromXlsx(Source.url(cbs_publications)),
    logRecord(),
    when(
      (context) => context.isNotEmpty("URL publicatie") && isValidUrl(context.getString('URL publicatie')),
      triple("URL publicatie", a, bibo.Article),
      when(
        "Project",
        addIri({
          prefix: prefix.cbs_project,
          content: 'Project',
          key: '_CBS_project_uri',
        }),
        triple('URL publicatie', sdo.producer, '_CBS_project_uri',),
        //triple('URL', dct.identifier, '_CBS_project_uri',), // for compatibility reasons we use dct:identifier and sdo:producer
      ),
      when('Titel publicatie',  triple('URL publicatie', dct.title, 'Titel publicatie')),
      when('Auteur(s)', triple('URL publicatie', dct.creator, 'Auteur(s)')),
      when(context => context.isNotEmpty('Datum publicatie') && year_pattern.test(context.getString('Datum publicatie')),   
        triple('URL publicatie', dct.date, literal('Datum publicatie', xsd.gYear))), // FIXME convert to xsd.date
      translateSome({
        content: 'Instelling',
        table: ror_table,
        key: '_institute'
      }),
      triple('URL publicatie', sdo.parentOrganization, '_institute'),
    ),
    //validate(Source.file('static/model.trig'), {terminateOn:"Violation"}),
    toTriplyDb(my_destination),
  );
  return etl;
}
