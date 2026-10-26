export interface SpaceObject {
  x: number
  y: number
  c: string
  s?: number
  dx?: number
  dy?: number
  r?: number
}

export interface GridGroup {
  id: string
  name: string
  n: number
  cols?: number
  rows?: number
  ar?: number
  cells: [number, number][]
  passages: [number, number][]
  objects: SpaceObject[]
  outline?: [number, number][]
  outlines?: [number, number][][]
  voids?: [number, number][][]
  dividers?: [[number, number], [number, number]][]
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
  box?: [number, number][]
  box_clipped?: boolean
  o?: 'h' | 'v'
}

export interface WebData {
  format: 'warehouse-location-web'
  v: number
  store: string
  store_name?: string
  default_floor?: string
  floor_selector?: boolean
  generated: string
  groups: GridGroup[]
  locations: LocationEntry[]
}
