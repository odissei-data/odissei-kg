import { a, xsd, sdo } from '@triplyetl/vocabularies'
//import { prefix } from '../helpers/generics.js'// , rdf1
import literalStringOrHtml, { destination, prefix } from "./odissei_kg_utils.js";
//import literalStringOrHtml from './literalStringOrHtml.js'
import { type MiddlewareList, when, forEach } from '@triplyetl/etl/generic'
import { addIri, triple, literal, iri } from '@triplyetl/etl/ratt'
import { logRecord } from '@triplyetl/etl/debug';

export default function dataverse(): MiddlewareList {
  return [
    //logRecord(),
    addIri({
      prefix: prefix.dataverseUrl,
      content: 'alias',
      key: 'dataverseIri'
    }),
    triple('dataverseIri', a, sdo.DataCatalog),
    forEach('dataverseContacts', [
      triple('$parent.dataverseIri', sdo.email, literal('contactEmail', xsd.anyURI))
    ]),
    triple('dataverseIri', sdo.name, 'name'),
    triple('dataverseIri', sdo.dateCreated, literal('creationDate', xsd.dateTime)),
    triple('dataverseIri', sdo.identifier, literal('id', xsd.integer)),
    
    when('affiliation', [
      triple('dataverseIri', sdo.affiliation, 'affiliation')
    ]),
    when('parentDataverseId', [
      triple(iri(prefix.dataverseUrl, 'parentDataverseId'), sdo.hasPart, 'dataverseIri')
    ]),
  
    when('description', [
      triple('dataverseIri', sdo.description, literalStringOrHtml('description'))
    ])
  ]
}
