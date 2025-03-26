import { a, xsd, sdo } from '@triplyetl/vocabularies'
//import { prefix } from '../helpers/generics.js'// , rdf1
import literalStringOrHtml, { destination, prefix } from "./utils/odissei_kg_utils.js";
//import literalStringOrHtml from './literalStringOrHtml.js'
import { type MiddlewareList, when, forEach } from '@triplyetl/etl/generic'
import { addIri, triple, literal, iri } from '@triplyetl/etl/ratt'

export default function dataverse(): MiddlewareList {
  return [
    addIri({
      prefix: "https://example.org/toBeReplacedLater/",
      content: 'id',
      key: 'dataverseIri'
    }),
    addIri({
      prefix: prefix.dataverseUrl,
      content: 'alias',
      key: 'DataverseNativeViewer'
    }),
    triple('dataverseIri', prefix.graph.concat('nativeViewer'), 'DataverseNativeViewer'),
    triple('dataverseIri', sdo.url, 'DataverseNativeViewer'),
    triple('dataverseIri', a, sdo.DataCatalog),
    forEach('dataverseContacts', [
      triple('$parent.dataverseIri', sdo.email, literal('contactEmail', xsd.anyURI))
    ]),
    triple('dataverseIri', sdo.name, 'name'),
    triple('dataverseIri', sdo.dateCreated, literal('creationDate', xsd.dateTime)),
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
