import { addIri, addLiteral, iri, literal, pairs, str, triple } from '@triplyetl/etl/ratt'
import { type MiddlewareList, when, whenForEach, ifElse } from '@triplyetl/etl/generic'
import { a, sdo, xsd } from '@triplyetl/vocabularies'
import { logRecord } from '@triplyetl/etl/debug'
import { prefix } from '../utils/odissei_kg_utils.js'

export default function dataset(): MiddlewareList {
  return [
    // The key 'latestVersion' is not always present in the current data when 'type' is 'dataset'.
    // For example it is not present in record 2.
    //logRecord({key:"latestVersion.metadataBlocks.variableInformation"}),
    logRecord({key:"id"}),
    when('latestVersion', [
      addIri({
        content: 'persistentUrl',
        key: 'datasetIri'
      }),
  
      // adding a license code when present or text warning when not
      ifElse({
        if: 'latestVersion.license.uri',
        then: [
            addIri({
            content: 'latestVersion.license.uri',
            key: 'licenseURI'
            }),
            triple('datasetIri', sdo.license, 'licenseURI'),
      ]},{
        else: [
          addIri({
            prefix: prefix.dataverseUrl,
            content: 'latestVersion.datasetPersistentId',
            key: 'prefixBespokeLicenseURI'
          }),
          addIri({
            prefix: 'prefixBespokeLicenseURI',
            content: str('&selectTab=termsTab'),
            key: 'bespokeLicenseURI'
          }),
        triple('datasetIri', sdo.license, 'bespokeLicenseURI')
      ]}),

      //pairs(iri(prefix.dataverse, 'dataverseId'),
      //  [sdo.hasPart, 'datasetIri']
      //),
      triple('datasetIri', a, sdo.Dataset),
      /**
      * Note: Line 32 corresponds with line 22 from etl-dataset.ts(git).
      * But the output created by that does not correspond with the output present in the
      * KG. It seems that 'latestVersion.id' is the wrong value. The right value is
      * 'latestVersion.datasetId'.
      * After investigating the KG, it seems that the right value is present in the key
      * 'latestVersion.datasetId'.
      */
      pairs('datasetIri',
        [sdo.url, literal('persistentUrl', xsd.anyURI)],
        //[prefix.iisgv.concat('nativeViewer'), literal('persistentUrl', xsd.anyURI)], //this line generates the same urls as the sdo.url but with a different predicate
        [sdo.datePublished, literal('latestVersion.releaseTime', xsd.dateTime)],
        [sdo.dateModified, literal('latestVersion.lastUpdateTime', xsd.dateTime)],
        [sdo.dateCreated, literal('latestVersion.createTime', xsd.dateTime)],
        [sdo.identifier, literal('latestVersion.datasetId', xsd.string)], 
        //[prefix.accessRequestRequired , literal('latestVersion.fileAccessRequest', xsd.string)]
      )
      //whenForEach('latestVersion.metadataBlocks.citation.fields', etlCitationfield()),
      //whenForEach('latestVersion.metadataBlocks.geospatial.fields', etlGeospatialfield()),
      //whenForEach('latestVersion.files', etlfiles())
    ])
  ]
}
