export interface SpaceObject {
  x: number
  y: number
  c: string
  s?: number
  dx?: number
  dy?: number
}

export interface GridGroup {
  id: string
  name: string
  n: number
  cells: [number, number][]
  passages: [number, number][]
  objects: SpaceObject[]
}

export interface LocationEntry {
  id: string
  k: string[]
  g: string
  x: number
  y: number
  w: string
  f: string
  no: string
}

export interface WebData {
  format: 'warehouse-location-web'
  v: number
  store: string
  generated: string
  groups: GridGroup[]
  locations: LocationEntry[]
}
