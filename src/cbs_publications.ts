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

const cbs_publications =
  "https://www.cbs.nl/-/media/cbs-op-maat/microdatabestanden/documents/2023/33/publicatie_overzicht_internet_augustus_2023.xlsx";

export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination);

  etl.use(
    fromXlsx(Source.url(cbs_publications)),
    logRecord(),
    when(
      ( context => context.isNotEmpty("URL") && context.getString('URL').startsWith('http')),
      triple("URL", a, bibo.Article),
      when(
        "Projectnummer",
        addIri({
          prefix: prefix.cbs_project,
          content: 'Projectnummer',
          key: '_CBS_project_uri',
        }),
        triple('URL', sdo.producer, '_CBS_project_uri',
        ),
      ),
      when('Pub_titel',  triple('URL', dct.title, 'Pub_titel')),
      when('Pub_auteur', triple('URL', dct.creator, 'Pub_auteur')),
      when('Pub_jaar',   triple('URL', dct.date, literal('Pub_jaar', xsd.string))), // FIXME convert to xsd.date
      translateSome({
        content: 'Instelling',
        table: ror_table,
        key: '_institute'
      }),
      triple('URL', sdo.parentOrganization, '_institute'),
    ),
    //validate(Source.file('static/model.trig'), {terminateOn:"Violation"}),
    toTriplyDb(my_destination),
  );
  return etl;
}
