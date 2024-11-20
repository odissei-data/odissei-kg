// Import middlewares and other required libraries............................
import { Etl, Source, when } from "@triplyetl/etl/generic";
import { toTriplyDb, fromXlsx, Iri } from "@triplyetl/etl/generic";
import { addHashedIri, addIri, iri, str, triple } from "@triplyetl/etl/ratt";
import { translateSome } from "@triplyetl/etl/ratt";
import { a, dct, sdo } from "@triplyetl/etl/vocab";
import { destination, prefix } from "./utils/odissei_kg_utils.js";
import { logRecord } from "@triplyetl/etl/debug";

// ETL input data: spreadsheets with CBS project information taken from HTML overview page at:
// https://www.cbs.nl/nl-nl/onze-diensten/maatwerk-en-microdata/microdata-zelf-onderzoek-doen/instellingen-en-projecten
const cbs_projects_before =
  "https://www.cbs.nl/-/media/cbs-op-maat/zelf-onderzoek-doen/projecten_met_bestanden_einddatum_voor_2024.xlsx";
const cbs_projects_after =
  "https://www.cbs.nl/-/media/cbs-op-maat/zelf-onderzoek-doen/projecten_met_bestanden_einddatum_na_2023.xlsx";

const my_destination = {
  defaultGraph: prefix.graph.concat("projects"),
  account: destination.account,
  prefixes: destination.prefixes,
  opts: destination.opts,
  dataset: destination.dataset,
};

export default async function (): Promise<Etl> {
  const etl = new Etl(my_destination);

 
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
        table: {
            'ABF Research':                                   Iri('http://abfresearch.nl/'),
            'Academisch Medisch Centrum Amsterdam (AMC) - UvA': Iri('https://ror.org/03t4gr691'),
            'Atlas Research B.V.':                            Iri('https://atlasresearch.nl/'),
            'CBS sector SAL':                                 Iri('https://ror.org/0408v4c28'),
            'CBS sector DBD':                                 Iri('https://ror.org/0408v4c28'),
            'Centerdata Research Institute':                  Iri('https://www.centerdata.nl/'),
            'Centraal Planbureau':                            Iri('https://ror.org/04rjxzd30'),
            'Erasmus Universiteit Rotterdam_Rotterdam School of Management':Iri('https://ror.org/057w15z03'),
            'Erasmus Universiteit Rotterdam_Erasmus School of Economics': Iri('https://ror.org/057w15z03'),
            'Erasmus Universiteit Rotterdam_Erasmus School of Social and Behavioural Sciences': Iri('https://ror.org/057w15z03'),
            'Gemeente Amsterdam, Dienst Onderzoek en Statistiek': Iri('https://ror.org/003h0ev22'),
            'Ministerie van Sociale Zaken':                   Iri('https://ror.org/05xaz7757'),
            'Ministerie van Sociale Zaken en Werkgelegenheid, Directie Financieel-Economische Zaken': 
                                                              Iri('https://ror.org/05xaz7757'),
            'Nederlands Instituut voor Onderzoek v/d Gezondheidszorg': Iri('https://ror.org/015xq7480'),
            'Nederlands Interdisciplinair Demografisch Instituut': Iri('https://ror.org/04kf5kc54'),
            'Panteia_EIM':                                    Iri('https://ror.org/00p5j4e25'),
            'Panteia, Branches en data, Strategisch onderzoek, Bedrijfslevenbeleid, Arbeidsmarkt en onderwijs': Iri('https://ror.org/00p5j4e25'),
            'Radboud Universiteit Nijmegen':                  Iri('https://ror.org/016xsfp80'),
            'Rijksuniversiteit Groningen':                    Iri('https://ror.org/012p63287'),
            'Rijksinstituut voor Volksgezondheid en Milieu':  Iri('https://ror.org/01cesdt21'),
            'SEO Economisch Onderzoek':                       Iri('https://ror.org/021088259'),
            'Sociaal en Cultureel Planbureau':                Iri('https://ror.org/04tagjk85'),
            'Stichting voor Economisch Onderzoek Rotterdam BV': Iri('https://seor.nl'),
            'Technische Universiteit Delft':                  Iri('https://ror.org/02e2c7k09'),
            'Tilburg University':                             Iri('https://ror.org/04b8v1s79'),
            'Tilburg University_ School of Economics and Management':  Iri('https://ror.org/04b8v1s79'),
            'TNO Bouw en Ondergrond':                         Iri('https://ror.org/01bnjb948'),
            'TNO Kwaliteit van Leven':                        Iri('https://ror.org/01bnjb948'),
            'Universiteit Maastricht_School of Business and Economics_Researchcentrum Onderwijs en Arbeidmarkt': 
                                                              Iri('https://ror.org/02jz4aj89'),
            'Universitair Medisch Centrum Erasmus Rotterdam': Iri('https://ror.org/018906e22'),
            'Universitair Medisch Centrum Leiden':            Iri('https://ror.org/05xvt9f17'),
            'Universitair Medisch Centrum Groningen':         Iri('https://ror.org/03cv38k47'),
            'Universitair Medisch Centrum Radboud Nijmegen':  Iri('https://ror.org/05wg1m734'),
            'Universiteit Maastricht_School of Business and Economics': Iri('https://ror.org/02jz4aj89'),
            'Universiteit Leiden':                            Iri('https://ror.org/027bh9e22'),
            'Universiteit Leiden_faculteit rechten':          Iri('https://ror.org/027bh9e22'),
            'Universiteit Utrecht':                           Iri('https://ror.org/04pp8hn57'),
            'VeiligheidNL':                                   Iri('https://ror.org/05qwpv987'),
            'Vrije Universiteit Amsterdam':                   Iri('https://ror.org/008xxew50'),
            'Vrije Universiteit Amsterdam_School of Business and Economics':  Iri('https://ror.org/008xxew50'),
            'Vrije Universiteit Amsterdam Medisch Centrum (VUMC)':
                                                              Iri('https://ror.org/00q6h8f30'),
            'Wageningen University & Research':               Iri('https://ror.org/04qw24q55'),
            'Wageningen University, Wageningen Economic Research': Iri('https://ror.org/04qw24q55'),
            'Yale University':                                Iri('https://ror.org/03v76x132')
        },
        // default: undefined,
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
