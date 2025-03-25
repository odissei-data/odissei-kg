import { type Middleware } from '@triplyetl/etl/generic'
const DataverseApi = 'https://portal.odissei.nl/api'

/**
 * We start with dataverse ID 1
 * We fetch the dataverse metadata object (https://datasets.iisg.amsterdam/api/dataverses/1),
 *    and the corresponding contents (https://datasets.iisg.amsterdam/api/dataverses/1/contents)
 * The content array may reference a dataset or other dataverses.
 *   - Datasets are fetched from eg https://datasets.iisg.amsterdam/api/datasets/9820
 *   - If it's a dataverse reference, we recurse and fetch it's metadata, contents, and all the things it references
 */
export default function fromApi (): Middleware {
  return async function _fromApi (ctx, next) {
    async function handleDataverse (dataverseId: number, parentDataverseId?: number): Promise <void> {
      const [dataverse, dataverseContents] = await fetchDataverse(dataverseId)
      dataverse.type = 'dataverse'
      if (parentDataverseId !== undefined) dataverse.parentDataverseId = parentDataverseId
      await next(dataverse, ctx.app.getNewStore())
      for (const contents of dataverseContents) {
        contents.parentDataverseId = dataverseId
        if (contents.type === 'dataset') {
          try {
            const dataset = await fetchDataset(contents.id)
            dataset.type = 'dataset'
            dataset.dataverseId = dataverseId
            await next(dataset, ctx.app.getNewStore())
          } catch (e) {
            console.warn(`Ignoring this error: ${(e as Error).message}`)
            if (!(e as Error).message.startsWith('[500]')) {
              throw e
            }
          }
        } else {
          await handleDataverse(contents.id, dataverseId)
        }
      }
    }
    await handleDataverse(1)
  }
}

async function fetchDataverse (dataverseId: number): Promise<[any, any]> {
  let dataverse: any
  let dataverseContents: any
  [dataverse, dataverseContents] = await Promise.all(
    [`${DataverseApi}/dataverses/${dataverseId}`, `${DataverseApi}/dataverses/${dataverseId}/contents`].map(
      async (link) => {
        const response = await fetch(link)
        if (response.status !== 200) {
          throw new Error(`[${response.status}] Failed fetching ${link}: ${response.statusText}`)
        }
        return await response.json()
      }
    )
  )
  /**
   * Remove annoying `data: {}` envelope
   */
  dataverse = { ...dataverse, ...dataverse.data }
  delete dataverse.data
  dataverseContents = dataverseContents.data

  return [dataverse, dataverseContents] as [any, any]
}
async function fetchDataset (datasetId: number): Promise<any> {
  const link = `${DataverseApi}/datasets/${datasetId}`
  const response = await fetch(link)
  if (response.status !== 200) throw new Error(`[${response.status}] Failed fetching ${link}: ${response.statusText}`)
  let json: any
  json = await response.json()
  /**
   * Remove annoying `data: {}` envelope
   */
  json = { ...json, ...json.data }
  delete json.data
  return json
}
