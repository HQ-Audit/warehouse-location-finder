import type { WebData } from './types'

const normalize = (value: string) => value.replace(/[^0-9A-Za-z가-힣]/g, '').toLowerCase()

export async function loadStoreData(storeCode: string): Promise<WebData> {
  const response = await fetch(`./webdata/${encodeURIComponent(storeCode)}/webdata.bin?t=${Date.now()}`, {
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('등록되지 않은 매장 코드입니다.')
  const bytes = new Uint8Array(await response.arrayBuffer())
  let jsonBytes = bytes
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    if (!('DecompressionStream' in window)) {
      throw new Error('현재 브라우저가 데이터 압축 해제를 지원하지 않습니다. 브라우저를 업데이트해 주세요.')
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    jsonBytes = new Uint8Array(await new Response(stream).arrayBuffer())
  }
  const data = JSON.parse(new TextDecoder().decode(jsonBytes)) as WebData
  if (data.format !== 'warehouse-location-web' || data.store !== storeCode) {
    throw new Error('매장 데이터 형식이 올바르지 않습니다.')
  }
  return data
}

export function findLocation(data: WebData, query: string) {
  const key = normalize(query)
  if (!key) return undefined
  return data.locations.find((location) => location.k.includes(key) || normalize(location.id) === key)
}
