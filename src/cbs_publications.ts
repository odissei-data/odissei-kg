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
const cbs_publications = "https://www.cbs.nl/-/media/cbs-op-maat/zelf-onderzoek-doen/publication_overview_internet_january_26.xlsx";
  
export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination);

  etl.use(
    fromXlsx(Source.url(cbs_publications)),
    logRecord(),
    when(
      ( context => context.isNotEmpty("URL publication") && context.getString('URL publication').startsWith('http')),
      triple("URL publication", a, bibo.Article),
      when(
        "Projectnumber",
        addIri({
          prefix: prefix.cbs_project,
          content: 'Projectnumber',
          key: '_CBS_project_uri',
        }),
        triple('URL publication', sdo.producer, '_CBS_project_uri',),
        //triple('URL', dct.identifier, '_CBS_project_uri',), // for compatibility reasons we use dct:identifier and sdo:producer
      ),
      when('Publication title',  triple('URL publication', dct.title, 'Publication title')),
      when('Author(s)', triple('URL publication', dct.creator, 'Author(s)')),
      when(context => context.isNotEmpty('Datum publicatie') && year_pattern.test(context.getString('Datum publicatie')),   
        triple('URL publication', dct.date, literal('Datum publicatie', xsd.gYear))), // FIXME convert to xsd.date
      translateSome({
        content: 'Institute',
        table: ror_table,
        key: '_institute'
      }),
      triple('URL publication', sdo.parentOrganization, '_institute'),
    ),
    //validate(Source.file('static/model.trig'), {terminateOn:"Violation"}),
    toTriplyDb(my_destination),
  );
  return etl;
}
