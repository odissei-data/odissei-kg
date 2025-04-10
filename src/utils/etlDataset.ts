import { addIri, addLiteral, addHashedIri, custom, iris, literal, pairs, str, triple } from '@triplyetl/etl/ratt'
import { type MiddlewareList, when, whenForEach, ifElse, fromJson } from '@triplyetl/etl/generic'
import { a, sdo, xsd } from '@triplyetl/vocabularies'
import { logRecord } from '@triplyetl/etl/debug'
import { prefix } from '../utils/odissei_kg_utils.js'
import TraceInfoFc from '@triplyetl/etl/_internal/runner/components/TraceInfo'

const dsv = {
  Dataset: prefix.dsv.concat("Dataset"),
  DatasetSchema: prefix.dsv.concat("DatasetSchema"),
  datasetSchema: prefix.dsv.concat("datasetSchema"),
}

export default function dataset(): MiddlewareList {
  return [
    // The key 'datasetVersion' is not always present in the current data when 'type' is 'dataset'.
    // For example it is not present in record 2.
    // logRecord({key:"datasetVersion.metadataBlocks.variableInformation"}),
    // logRecord({key:"id"}),
    when('datasetVersion', [
      addIri({
        content: 'persistentUrl',
        key: 'datasetIri'
      }),
  
      // addIri(
      //   { content: 'datasetVersion.metadataBlocks.variableInformation.fields[0].value[0].odisseiVariableVocabularyURI.value',
      //     key: '_varIri'
      //   }
      // ),
      addHashedIri({
        prefix: prefix.dataverseGraph,
        content: ['datasetIri', str('schema')],
        key: '_datasetSchemaIri'
      }),
      //logRecord({key:"datasetVersion.metadataBlocks.variableInformation.fields[0].value[0].odisseiVariableVocabularyURI.value"}),
      triple('datasetIri', a, dsv.Dataset),
      triple('_datasetSchemaIri', a, dsv.DatasetSchema),
      triple('datasetIri', dsv.datasetSchema, '_datasetSchemaIri'),
      // triple('_datasetSchemaIri', dsv.datasetSchema, iri('_varIri')),
      // adding a license code when present or text warning when not
      when(
        context => {
          const variableInfo = context.getAny('datasetVersion.metadataBlocks.variableInformation.fields');
          return (
            Array.isArray(variableInfo) &&
            variableInfo.length > 0 &&
            variableInfo[0]?.value &&
            Array.isArray(variableInfo[0].value) &&
            variableInfo[0].value.length > 0 &&
            variableInfo[0].value[0]?.odisseiVariableVocabularyURI
          );
        },
        custom.add({
          value: context => {
            const fields = context.getAny('datasetVersion.metadataBlocks.variableInformation.fields');
            return fields?.[0]?.value || [];
          },
          key: '_variables'
        }),
        custom.change({
          key: '_variables',
          type: 'any',
          change: value => {
            return (value as any).map((item: any) => {
              const uri = item?.odisseiVariableVocabularyURI;
              if (uri) {
                const uriValues = Object.values(uri);
                return String(uriValues[3] || ''); // Safely access the 4th value or return an empty string
              }
              return 'http://www.nourl.com'; // Fallback if `odisseiVariableVocabularyURI` is missing
            });
          }
        }),
        triple('datasetIri', dsv.datasetSchema, iris('_variables')),
      ),
      ifElse({
        if: 'datasetVersion.license.uri',
        then: [
            addIri({
            content: 'datasetVersion.license.uri',
            key: 'licenseURI'
            }),
            triple('datasetIri', sdo.license, 'licenseURI'),
      ]},{
        else: [
          addIri({
            prefix: prefix.dataverseUrl,
            content: 'datasetVersion.datasetPersistentId',
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
      * KG. It seems that 'datasetVersion.id' is the wrong value. The right value is
      * 'datasetVersion.datasetId'.
      * After investigating the KG, it seems that the right value is present in the key
      * 'datasetVersion.datasetId'.
      */
      pairs('datasetIri',
        [sdo.url, literal('persistentUrl', xsd.anyURI)],
        //[prefix.iisgv.concat('nativeViewer'), literal('persistentUrl', xsd.anyURI)], //this line generates the same urls as the sdo.url but with a different predicate
        [sdo.datePublished, literal('datasetVersion.releaseTime', xsd.dateTime)],
        [sdo.dateModified, literal('datasetVersion.lastUpdateTime', xsd.dateTime)],
        [sdo.dateCreated, literal('datasetVersion.createTime', xsd.dateTime)],
        [sdo.identifier, literal('datasetVersion.datasetId', xsd.string)], 
        //[prefix.accessRequestRequired , literal('datasetVersion.fileAccessRequest', xsd.string)]
      )
      //whenForEach('datasetVersion.metadataBlocks.citation.fields', etlCitationfield()),
      //whenForEach('datasetVersion.metadataBlocks.geospatial.fields', etlGeospatialfield()),
      //whenForEach('datasetVersion.files', etlfiles())
    ])
  ]
}
