import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Download, LocateFixed, MapPin, Search, Share, Warehouse, X } from 'lucide-react'
import { findLocation, loadStoreData } from './data'
import type { GridGroup, LocationEntry, SpaceObject, WebData } from './types'

function Brand() {
  return <div className="brand"><span className="brand-mark"><img src="./abc-mart-black.svg" alt="" /></span><span>창고 로케이션 찾기</span></div>
}

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)
  const [showGuide, setShowGuide] = useState(false)
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
      setShowGuide(false)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  const install = async () => {
    if (promptEvent) {
      await promptEvent.prompt()
      const choice = await promptEvent.userChoice
      if (choice.outcome === 'accepted') setInstalled(true)
      setPromptEvent(null)
      return
    }
    setShowGuide(true)
  }

  return <>
    <button className="install-app-button" type="button" onClick={install} aria-label="홈 화면에 앱처럼 추가">
      <Download size={15} /><span>앱처럼 쓰기</span>
    </button>
    {showGuide && <div className="install-guide-backdrop" role="presentation" onClick={() => setShowGuide(false)}>
      <section className="install-guide" role="dialog" aria-modal="true" aria-labelledby="install-guide-title" onClick={(event) => event.stopPropagation()}>
        <button className="install-guide-close" type="button" onClick={() => setShowGuide(false)} aria-label="닫기"><X /></button>
        <img src="./abc-mart-black.svg" alt="ABC-MART" />
        <h2 id="install-guide-title">홈 화면에 추가하기</h2>
        {isIos ? <p><Share />Safari 아래의 <strong>공유</strong>를 누른 뒤<br /><strong>홈 화면에 추가</strong>를 선택하세요.</p>
          : <p>브라우저 메뉴의 <strong>앱 설치</strong> 또는<br /><strong>홈 화면에 추가</strong>를 선택하세요.</p>}
        <small>추가하면 기존 ABC-MART 아이콘으로 바로 실행할 수 있습니다.</small>
      </section>
    </div>}
  </>
}

function StoreAccess({ onAccess }: { onAccess: (data: WebData) => void }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!/^\d{4}$/.test(code)) { setError('매장 코드 숫자 4자리를 입력해 주세요.'); return }
    setLoading(true)
    try { onAccess(await loadStoreData(code)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : '매장 데이터를 불러오지 못했습니다.') }
    finally { setLoading(false) }
  }
  return <main className="access-page">
    <section className="access-story">
      <Brand />
      <div className="story-copy">
        <p className="eyebrow">WAREHOUSE LOCATION</p>
        <h1>찾는 방향을<br /><em>한눈에.</em></h1>
        <p>로케이션 번호를 입력하면 창고에서<br />가장 먼저 향할 위치를 보여드립니다.</p>
      </div>
      <div className="story-rule"><LocateFixed /><div><span>인지형 공간 안내</span><strong>빠르고 일관된 집기 동선</strong></div></div>
    </section>
    <section className="access-panel">
      <form className="access-card" onSubmit={submit}>
        <div className="mobile-brand"><Brand /></div>
        <p className="eyebrow">STORE ACCESS</p>
        <h2>매장 접속</h2>
        <p className="help">우리 매장의 창고 그리드 데이터로 접속합니다.</p>
        <label>매장 코드<div className="input-wrap"><Warehouse size={19} /><input autoFocus inputMode="numeric" pattern="[0-9]*" maxLength={4} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="숫자 4자리" /></div></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={loading}>{loading ? '확인 중…' : '접속하기'}<ArrowRight size={18} /></button>
        <p className="privacy-note">원본 도면 이미지는 웹 데이터에 저장하지 않습니다.</p>
      </form>
    </section>
  </main>
}

function objectStyle(object: SpaceObject, bounds: Bounds) {
  const x = object.x + (object.dx || 0)
  const y = object.y + (object.dy || 0)
  return {
    left: `${((x - bounds.minX + .5) / bounds.cols) * 100}%`,
    top: `${((y - bounds.minY + .5) / bounds.rows) * 100}%`,
    transform: `translate(-50%, -50%) rotate(${object.r || 0}deg) scale(${object.s || 1})`,
  }
}

type Bounds = { minX: number; minY: number; maxX: number; maxY: number; cols: number; rows: number }

function gridBounds(group: GridGroup): Bounds {
  const points = [...group.cells, ...group.objects.map((object) => [object.x, object.y] as [number, number])]
  if (!points.length) return { minX: 1, minY: 1, maxX: group.n, maxY: group.n, cols: group.n, rows: group.n }
  const minX = Math.max(1, Math.min(...points.map(([x]) => x)))
  const minY = Math.max(1, Math.min(...points.map(([, y]) => y)))
  const maxX = Math.min(group.n, Math.max(...points.map(([x]) => x)))
  const maxY = Math.min(group.n, Math.max(...points.map(([, y]) => y)))
  return { minX, minY, maxX, maxY, cols: maxX - minX + 1, rows: maxY - minY + 1 }
}

type AlignedBox = { item: LocationEntry; x: number; y: number; width: number; height: number; rotation: number }

function alignedLocationBoxes(items: LocationEntry[], aspectRatio: number): AlignedBox[] {
  const ar = Math.max(.1, Number(aspectRatio || 1))
  const values = items.flatMap((item) => {
    if (!item.box || item.box.length < 3) return []
    const points = item.box.map(([x, y]) => [Number(x), Number(y)] as [number, number])
    const center: [number, number] = [
      points.reduce((sum, point) => sum + point[0], 0) / points.length,
      points.reduce((sum, point) => sum + point[1], 0) / points.length,
    ]
    let twiceArea = 0
    points.forEach((point, index) => {
      const next = points[(index + 1) % points.length]
      twiceArea += point[0] * next[1] - next[0] * point[1]
    })
    const edges = points.map((point, index) => {
      const next = points[(index + 1) % points.length]
      const dx = next[0] - point[0]
      const dy = next[1] - point[1]
      return { length: Math.hypot(dx * ar, dy), dx, dy }
    })
    const longest = edges.reduce((best, value) => value.length > best.length ? value : best, edges[0] || { length: 0, dx: 1, dy: 0 })
    // The editor's explicit h/v type is authoritative. Some WGM files keep
    // the old axis-aligned polygon after the user changes only the box type,
    // so deriving orientation from the polygon lays vertical boxes down.
    const vertical = item.o === 'v'
    const base = vertical ? 90 : 0
    let rotation = Math.atan2(longest.dy, longest.dx) * 180 / Math.PI - base
    rotation = ((rotation + 90) % 180 + 180) % 180 - 90
    // Keep the residual free-rotation angle within the selected type's axis.
    // A 90-degree discrepancy is legacy geometry, not a request to swap h/v.
    if (rotation > 45) rotation -= 90
    else if (rotation < -45) rotation += 90
    return [{ item, center, side: Math.sqrt(Math.abs(twiceArea) / 2 / ar), rotation, vertical }]
  })
  const sides = values.map((value) => value.side).filter((value) => Number.isFinite(value) && value > .001).sort((a, b) => a - b)
  const median = sides.length ? sides[Math.floor(sides.length / 2)] : .018
  const snapSide = Math.max(.013, median * 1.45)
  const snapHeight = Math.max(.007, median * .78) * ar
  const side = Math.max(.018, median * 1.8)
  const height = Math.max(.010, median * .98) * ar
  const snapCenters = (axis: 0 | 1, tolerance: number) => {
    const ordered = [...values].sort((a, b) => a.center[axis] - b.center[axis])
    let cluster: typeof values = []
    const finish = () => {
      if (cluster.length >= 2) {
        const mean = cluster.reduce((sum, value) => sum + value.center[axis], 0) / cluster.length
        cluster.forEach((value) => { value.center[axis] = mean })
      }
      cluster = []
    }
    ordered.forEach((value) => {
      const mean = cluster.length ? cluster.reduce((sum, item) => sum + item.center[axis], 0) / cluster.length : value.center[axis]
      if (!cluster.length || Math.abs(value.center[axis] - mean) <= tolerance) cluster.push(value)
      else { finish(); cluster = [value] }
    })
    finish()
  }
  snapCenters(0, snapSide * .55)
  snapCenters(1, snapHeight * .70)
  return values.map((value) => {
    const vertical = value.vertical
    const width = vertical ? height / ar : side
    const boxHeight = vertical ? side * ar : height
    return {
      item: value.item,
      x: Math.min(1 - width / 2, Math.max(width / 2, value.center[0])),
      y: Math.min(1 - boxHeight / 2, Math.max(boxHeight / 2, value.center[1])),
      width,
      height: boxHeight,
      rotation: value.rotation,
    }
  })
}

function regionPath(points?: [number, number][]) {
  if (!points || points.length < 3) return ''
  return `M ${points.map(([x, y]) => `${Number(x) * 1000} ${Number(y) * 1000}`).join(' L ')} Z`
}

function ObjectBadge({ object, bounds }: { object: SpaceObject; bounds: Bounds }) {
  const code = object.c
  const door = code === 'DOOR' || code.startsWith('ENT_')
  if (door) return <span className="space-object label door" style={objectStyle(object, bounds)} title="출입구">DOOR</span>
  if (code === 'COL') return <span className="space-object column" style={objectStyle(object, bounds)} title="기둥" />
  return <span className={`space-object label ${code.toLowerCase()}`} style={objectStyle(object, bounds)}>{code === 'POS' ? 'COUNTER' : code}</span>
}

function GridMap({ group, selected, locations }: { group: GridGroup; selected: LocationEntry | null; locations: LocationEntry[] }) {
  const bounds = useMemo(() => gridBounds(group), [group])
  const passages = useMemo(() => new Set(group.passages.map(([x, y]) => `${x},${y}`)), [group])
  const locationBoxes = useMemo(() => locations.filter((item) => item.g === group.id && (!selected || item.f === selected.f) && item.box && item.box.length >= 3), [group.id, locations, selected])
  const alignedBoxes = useMemo(() => alignedLocationBoxes(locationBoxes, Number(group.ar || 1)), [group.ar, locationBoxes])
  const fullBounds: Bounds = { minX: 1, minY: 1, maxX: group.cols || group.n, maxY: group.rows || group.n, cols: group.cols || group.n, rows: group.rows || group.n }
  const outline = regionPath(group.outline || [[0, 0], [1, 0], [1, 1], [0, 1]])
  const holes = (group.voids || []).map(regionPath).join(' ')
  return <div className="grid-stage" style={{ aspectRatio: locationBoxes.length ? String(Number(group.ar || 1)) : `${bounds.cols} / ${bounds.rows}` }}>
    <div className="cognitive-grid" style={{ display: locationBoxes.length ? 'none' : 'grid', gridTemplateColumns: `repeat(${bounds.cols}, 1fr)`, gridTemplateRows: `repeat(${bounds.rows}, 1fr)` }}>
      {group.cells.map(([x, y]) => {
        if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY || passages.has(`${x},${y}`)) return null
        const active = selected?.x === x && selected?.y === y
        return <span key={`${x}-${y}`} className={`grid-cell ${active ? 'active' : ''}`} style={{ gridColumn: x - bounds.minX + 1, gridRow: y - bounds.minY + 1 }} aria-label={active ? `선택 위치 ${x}, ${y}` : undefined}>{active && <MapPin />}</span>
      })}
    </div>
    {locationBoxes.length > 0 && <svg className="box-map" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="실제 로케이션 박스 지도">
      {alignedBoxes.map((value) => <g key={value.item.id} transform={`rotate(${value.rotation} ${value.x * 1000} ${value.y * 1000})`}><rect x={(value.x - value.width / 2) * 1000} y={(value.y - value.height / 2) * 1000} width={value.width * 1000} height={value.height * 1000} rx="3" className={`location-box ${value.item.id === selected?.id ? 'active' : ''}`} /></g>)}
    </svg>}
    <svg className="shape-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
      <path d={`${outline} ${holes}`} fillRule="evenodd" />
      {(group.dividers || []).map(([start, end], index) => <line key={`divider-${index}`} className="divider-line" x1={start[0] * 1000} y1={start[1] * 1000} x2={end[0] * 1000} y2={end[1] * 1000} />)}
    </svg>
    {group.objects.map((object, index) => <ObjectBadge key={`${object.c}-${object.x}-${object.y}-${index}`} object={object} bounds={locationBoxes.length ? fullBounds : bounds} />)}
    {alignedBoxes.filter((value) => value.item.id === selected?.id).map((value) => <span key={`pin-${value.item.id}`} className="location-pin" style={{ left: `${value.x * 100}%`, top: `${value.y * 100}%` }} aria-label={`찾는 위치 ${value.item.no}`}>📍</span>)}
  </div>
}

function Finder({ data }: { data: WebData }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<LocationEntry | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const floors = useMemo(() => [...new Set(data.locations.map((location) => String(location.f || '')).filter(Boolean))].sort((a, b) => Number(a) - Number(b)), [data])
  const showFloors = Boolean(data.floor_selector && floors.length > 1)
  const [selectedFloor, setSelectedFloor] = useState(() => floors.includes(String(data.default_floor || '')) ? String(data.default_floor) : (floors[0] || ''))
  const floorLabel = (floor: string) => floor === '0' ? '지하 1층' : `${floor}층`
  const storeLabel = data.store_name?.trim() || data.store
  const shortSearch = floors.length <= 1 || showFloors
  const visibleLocations = useMemo(() => showFloors ? data.locations.filter((location) => String(location.f) === selectedFloor) : data.locations, [data, selectedFloor, showFloors])
  const overviewLocation = visibleLocations[0]
  const group = selected ? data.groups.find((item) => item.id === selected.g) : data.groups.find((item) => item.id === overviewLocation?.g) || data.groups[0]
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const found = findLocation(data, query, showFloors ? selectedFloor : undefined)
    if (!found) {
      setSelected(null)
      setError(showFloors ? `${floorLabel(selectedFloor)}에는 해당 로케이션이 없습니다.` : '해당 로케이션을 찾지 못했습니다. 번호를 다시 확인해 주세요.')
      return
    }
    setSelected(found); setError('')
  }
  const resetSearch = () => {
    setQuery(''); setSelected(null); setError('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }
  const title = selected ? `${selected.w.toUpperCase() === 'B' ? '창고' : selected.w} ${floors.length > 1 && selected.f ? `${floorLabel(String(selected.f))} ` : ''}${selected.no}` : ''
  return <main className="finder-page">
    <header><Brand /><div className="header-actions"><InstallAppButton /></div></header>
    <div className="finder-content">
      <section className="finder-heading"><p className="eyebrow">LOCATION FINDER</p><h1>로케이션 찾기</h1><p>{storeLabel} · 로케이션 번호를 입력하세요.</p></section>
      {showFloors && <nav className="floor-tabs" aria-label="창고 층 선택">{floors.map((floor) => <button type="button" key={floor} className={floor === selectedFloor ? 'active' : ''} onClick={() => { setSelectedFloor(floor); setSelected(null); setQuery(''); setError('') }}>{floorLabel(floor)}</button>)}</nav>}
      <form className={`location-search ${selected ? 'has-reset' : ''}`} onSubmit={submit}>
        <div className="search-input"><Search /><input ref={inputRef} autoFocus inputMode="numeric" value={query} onChange={(event) => setQuery(event.target.value.replace(/[^0-9A-Za-z가-힣-]/g, ''))} placeholder={shortSearch ? '예: 128' : '예: 1128'} /></div>
        <div className={`search-actions ${selected ? 'has-reset' : ''}`}>
          <button className="primary-button">위치 보기</button>
          {selected && <button type="button" className="search-reset-button" onClick={resetSearch}><ArrowLeft />다른 위치 찾기</button>}
        </div>
      </form>
      {error && <p className="form-error result-error">{error}</p>}
      {group && <section className={`result-card ${selected ? '' : 'overview'}`}>
        <div className="result-title"><span><Check /></span><div><p>{selected ? '검색 결과' : '창고 배치'}</p><h2>{selected ? title : showFloors ? `${floorLabel(selectedFloor)} 전체 배치` : '전체 배치'}</h2><small>{selected?.box ? `${group.name} · 실제 로케이션 박스` : selected ? `${group.name} · Grid (${selected.x}, ${selected.y})` : `${group.name} · 로케이션을 검색하면 핀으로 표시됩니다.`}</small></div></div>
        <GridMap group={group} selected={selected} locations={visibleLocations} />
        <div className="result-guide"><LocateFixed /><p><strong>{selected ? '표시된 위치부터 찾아보세요.' : '전체 배치를 먼저 확인하세요.'}</strong><span>{selected?.box ? '빨간 핀과 노란 칸이 찾는 로케이션입니다.' : selected ? '빨간 핀과 강조된 칸이 찾는 위치입니다.' : shortSearch ? '위 검색창에 로케이션 번호를 입력하세요. 예: 128' : '위 검색창에 층과 로케이션 번호를 입력하세요. 예: 1128'}</span></p></div>
      </section>}
    </div>
  </main>
}

export default function App() {
  const [data, setData] = useState<WebData | null>(null)
  const [directLoading, setDirectLoading] = useState(false)
  const directStoreCode = useMemo(() => {
    const queryStore = new URLSearchParams(window.location.search).get('store')?.trim() || ''
    if (/^\d{4}$/.test(queryStore)) {
      localStorage.setItem('warehouse-location:last-store', queryStore)
      return queryStore
    }
    if (isStandalone()) return localStorage.getItem('warehouse-location:last-store')?.trim() || ''
    return ''
  }, [])

  const acceptData = (value: WebData) => {
    setData(value)
    if (/^\d{4}$/.test(String(value.store))) {
      localStorage.setItem('warehouse-location:last-store', String(value.store))
    }
  }

  useEffect(() => {
    if (!/^\d{4}$/.test(directStoreCode)) return
    setDirectLoading(true)
    loadStoreData(directStoreCode)
      .then(acceptData)
      .catch(() => setDirectLoading(false))
  }, [directStoreCode])

  if (directLoading && !data) {
    return <main className="access-page"><section className="access-panel"><div className="access-card"><Brand /><p className="help">매장 지도를 불러오는 중입니다…</p></div></section></main>
  }
  return data ? <Finder data={data} /> : <StoreAccess onAccess={acceptData} />
}
