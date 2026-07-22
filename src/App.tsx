import { useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, DoorOpen, LocateFixed, LogOut, MapPin, Search, Warehouse } from 'lucide-react'
import { findLocation, loadStoreData } from './data'
import type { GridGroup, LocationEntry, SpaceObject, WebData } from './types'

function Brand() {
  return <div className="brand"><span className="brand-mark"><img src="./abc-mart-black.svg" alt="" /></span><span>창고 로케이션 찾기</span></div>
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
        <p className="privacy-note">매장명과 원본 도면은 웹 데이터에 저장하지 않습니다.</p>
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
    transform: `translate(-50%, -50%) scale(${object.s || 1})`,
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

function ObjectBadge({ object, bounds }: { object: SpaceObject; bounds: Bounds }) {
  const code = object.c
  const direction = code.startsWith('ENT_') ? code.slice(4) : ''
  const rotation = direction === 'RIGHT' ? 90 : direction === 'DOWN' ? 180 : direction === 'LEFT' ? 270 : 0
  if (direction) return <span className="space-object entrance" style={objectStyle(object, bounds)} title="입구"><ArrowRight style={{ transform: `rotate(${rotation - 90}deg)` }} /></span>
  if (code === 'COL') return <span className="space-object column" style={objectStyle(object, bounds)} title="기둥" />
  return <span className={`space-object label ${code.toLowerCase()}`} style={objectStyle(object, bounds)}>{code}</span>
}

function GridMap({ group, selected }: { group: GridGroup; selected: LocationEntry }) {
  const bounds = useMemo(() => gridBounds(group), [group])
  const passages = useMemo(() => new Set(group.passages.map(([x, y]) => `${x},${y}`)), [group])
  return <div className="grid-stage" style={{ aspectRatio: `${bounds.cols} / ${bounds.rows}` }}>
    <div className="cognitive-grid" style={{ gridTemplateColumns: `repeat(${bounds.cols}, 1fr)`, gridTemplateRows: `repeat(${bounds.rows}, 1fr)` }}>
      {group.cells.map(([x, y]) => {
        if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY || passages.has(`${x},${y}`)) return null
        const active = selected.x === x && selected.y === y
        return <span key={`${x}-${y}`} className={`grid-cell ${active ? 'active' : ''}`} style={{ gridColumn: x - bounds.minX + 1, gridRow: y - bounds.minY + 1 }} aria-label={active ? `선택 위치 ${x}, ${y}` : undefined}>{active && <MapPin />}</span>
      })}
    </div>
    {group.objects.map((object, index) => <ObjectBadge key={`${object.c}-${object.x}-${object.y}-${index}`} object={object} bounds={bounds} />)}
  </div>
}

function Finder({ data, onExit }: { data: WebData; onExit: () => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<LocationEntry | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const floors = useMemo(() => new Set(data.locations.map((location) => location.f).filter(Boolean)), [data])
  const group = selected ? data.groups.find((item) => item.id === selected.g) : undefined
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const found = findLocation(data, query)
    if (!found) { setSelected(null); setError('해당 로케이션을 찾지 못했습니다. 번호를 다시 확인해 주세요.'); return }
    setSelected(found); setError('')
  }
  const title = selected ? `${selected.w.toUpperCase() === 'B' ? '창고' : selected.w} ${floors.size > 1 && selected.f ? `${selected.f}층 ` : ''}${selected.no}` : ''
  return <main className="finder-page">
    <header><Brand /><button onClick={onExit}><LogOut size={17} />매장 변경</button></header>
    <div className="finder-content">
      <section className="finder-heading"><p className="eyebrow">LOCATION FINDER</p><h1>로케이션 찾기</h1><p>매장 {data.store} · 로케이션 번호를 입력하세요.</p></section>
      <form className="location-search" onSubmit={submit}>
        <div className="search-input"><Search /><input ref={inputRef} autoFocus inputMode="numeric" value={query} onChange={(event) => setQuery(event.target.value.replace(/[^0-9A-Za-z가-힣-]/g, ''))} placeholder="예: 1128" /></div>
        <button className="primary-button">위치 보기</button>
      </form>
      {error && <p className="form-error result-error">{error}</p>}
      {!selected && !error && <section className="empty-state"><span><DoorOpen /></span><h2>찾을 로케이션을 입력하세요</h2><p>예: 창고-1층-128은 <strong>1128</strong>로 조회할 수 있습니다.</p></section>}
      {selected && group && <section className="result-card">
        <div className="result-title"><span><Check /></span><div><p>검색 결과</p><h2>{title}</h2><small>{group.name} · Grid ({selected.x}, {selected.y})</small></div></div>
        <GridMap group={group} selected={selected} />
        <div className="result-guide"><LocateFixed /><p><strong>표시된 위치부터 찾아보세요.</strong><span>그리드는 실제 거리가 아닌 방향 인지를 위한 안내입니다.</span></p></div>
        <button className="secondary-button" onClick={() => { setQuery(''); setSelected(null); setError(''); setTimeout(() => inputRef.current?.focus(), 0) }}><ArrowLeft />다른 로케이션 찾기</button>
      </section>}
    </div>
  </main>
}

export default function App() {
  const [data, setData] = useState<WebData | null>(null)
  return data ? <Finder data={data} onExit={() => setData(null)} /> : <StoreAccess onAccess={setData} />
}
