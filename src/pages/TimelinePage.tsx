import { useEffect, useMemo, useState } from 'react'
import {
  Search, Route, X, Trash2, Clock, MapPin,
  Ban, RotateCcw, AlertTriangle, Construction,
} from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import { useClosureStore } from '@/store/useClosureStore'
import {
  formatTimestamp,
  getTimeOfDay,
  getWeatherIcon,
  getTreeIcon,
  getPedestrianIcon,
} from '@/utils/sceneHelpers'
import type { WindowScene, ClosureRecord } from '@/types'

type TimelineEntry =
  | { kind: 'scene'; anchor: number; scene: WindowScene }
  | { kind: 'closure'; anchor: number; closure: ClosureRecord }

/** 封路持续时长的简短表述 */
function formatDuration(from: string, to: string): string {
  const ms = new Date(to).getTime() - new Date(from).getTime()
  const minutes = Math.max(0, Math.round(ms / 60000))
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`
  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  return restHours ? `${days} 天 ${restHours} 小时` : `${days} 天`
}

export default function TimelinePage() {
  const {
    routeNames, selectedRoute, currentRouteScenes,
    selectRoute, loadAll, deleteScene,
  } = useSceneStore()
  const {
    closures, closedRouteNames, loadClosures,
    registerClosure, reopen, getActiveClosure,
  } = useClosureStore()
  const [search, setSearch] = useState('')
  const [detailScene, setDetailScene] = useState<WindowScene | null>(null)
  const [showClosureForm, setShowClosureForm] = useState(false)
  const [closureRoute, setClosureRoute] = useState('')
  const [closureReason, setClosureReason] = useState('')
  const [formHint, setFormHint] = useState('')

  useEffect(() => {
    loadAll()
    loadClosures()
  }, [loadAll, loadClosures])

  // 窗景与封路各自有记录的线路合并显示；删除某线路全部窗景不会抹掉其封路状态
  const allRouteNames = useMemo(
    () => Array.from(new Set([...routeNames, ...closedRouteNames])).sort(),
    [routeNames, closedRouteNames]
  )

  const filteredRoutes = allRouteNames.filter((r) =>
    r.toLowerCase().includes(search.toLowerCase())
  )

  // 窗景与封路记录合流，按各自的时间锚点排在同一条时间线上：
  // 未恢复封路锚在封路时间（始终浮在最上），恢复后封路区间落在它原本的时间位置
  const entries = useMemo<TimelineEntry[]>(() => {
    const sceneEntries: TimelineEntry[] = currentRouteScenes.map((scene) => ({
      kind: 'scene',
      anchor: new Date(scene.timestamp).getTime(),
      scene,
    }))
    const closureEntries: TimelineEntry[] = closures
      .filter((c) => c.routeName === selectedRoute)
      .map((closure) => ({
        kind: 'closure',
        anchor: new Date(closure.closedAt).getTime(),
        closure,
      }))
    return [...sceneEntries, ...closureEntries].sort((a, b) => b.anchor - a.anchor)
  }, [currentRouteScenes, closures, selectedRoute])

  const activeClosure = selectedRoute ? getActiveClosure(selectedRoute) : null

  const openClosureForm = () => {
    setClosureRoute(selectedRoute)
    setClosureReason('')
    setFormHint('')
    setShowClosureForm(true)
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    const routeName = closureRoute.trim()
    const reason = closureReason.trim()
    if (!routeName || !reason) return
    const { same } = registerClosure(routeName, reason)
    if (same) {
      setFormHint(`「${routeName}」已有未恢复的封路，无需重复登记`)
      return
    }
    setShowClosureForm(false)
    if (selectedRoute !== routeName) selectRoute(routeName)
  }

  const handleReopen = () => {
    if (activeClosure) reopen(activeClosure.routeName)
  }

  const handleDelete = (id: string) => {
    deleteScene(id)
    setDetailScene(null)
  }

  return (
    <div className="min-h-screen bg-teal-950 font-serif text-mist-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold tracking-wide text-dusk-400">
          窗景时间线
        </h1>

        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-mist-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索路线..."
              className="w-full rounded-lg border border-teal-800 bg-teal-900/60 py-2.5 pl-10 pr-4 text-sm text-mist-100 placeholder:text-mist-500 focus:border-dusk-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => selectRoute('')}
              className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                !selectedRoute
                  ? 'bg-dusk-400 text-teal-950'
                  : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
              }`}
            >
              全部
            </button>
            {filteredRoutes.map((name) => {
              const isClosed = getActiveClosure(name) !== null
              return (
                <button
                  key={name}
                  onClick={() => selectRoute(name)}
                  className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                    selectedRoute === name
                      ? 'bg-dusk-400 text-teal-950'
                      : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
                  }`}
                >
                  <Route className="mr-1 inline w-3 h-3" />
                  {name}
                  {isClosed && (
                    <Ban className="ml-1 inline w-3 h-3 text-amber-400" />
                  )}
                </button>
              )
            })}
            <button
              onClick={openClosureForm}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 transition-colors hover:bg-amber-500/20"
            >
              <Ban className="w-3 h-3" />
              登记封路
            </button>
          </div>
        </div>

        {selectedRoute && activeClosure && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0 text-amber-400" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-amber-200">
                「{selectedRoute}」封路中 · 自 {formatTimestamp(activeClosure.closedAt)} 起
              </p>
              {activeClosure.reason && (
                <p className="mt-0.5 text-xs text-amber-300/90">
                  原因：{activeClosure.reason}
                </p>
              )}
            </div>
            <button
              onClick={handleReopen}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-1.5 text-xs text-amber-200 transition-colors hover:bg-amber-500/30"
            >
              <RotateCcw className="w-3 h-3" />
              恢复通行
            </button>
          </div>
        )}

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-mist-400">
            <div className="mb-4 text-6xl opacity-30">🪟</div>
            <p className="text-lg">
              {selectedRoute ? '该路线暂无窗景记录' : '选择一条路线，开始浏览窗景'}
            </p>
          </div>
        ) : (
          <div className="relative pl-8">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-teal-800" />
            <div className="space-y-6">
              {entries.map((entry) =>
                entry.kind === 'closure' ? (
                  <ClosureTimelineItem key={`closure-${entry.closure.id}`} closure={entry.closure} />
                ) : (
                  <div key={entry.scene.id} className="relative flex gap-4">
                    <div className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-dusk-400 ring-4 ring-teal-950" />
                    <div className="w-20 shrink-0 pt-0.5 text-right">
                      <p className="text-xs text-dusk-400">
                        {formatTimestamp(entry.scene.timestamp)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-mist-500">
                        {getTimeOfDay(entry.scene.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={() => setDetailScene(entry.scene)}
                      className="group flex-1 rounded-xl border border-teal-800 bg-teal-900/50 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-dusk-400/40 hover:shadow-lg hover:shadow-dusk-400/10"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {getWeatherIcon(entry.scene.weather)}
                        <span className="text-sm font-semibold text-mist-100">
                          {entry.scene.segment}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mb-1.5 text-mist-400">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">{entry.scene.routeName}</span>
                        <span className="mx-1 text-teal-700">·</span>
                        <span className="text-xs">{entry.scene.seatDirection}侧</span>
                      </div>
                      {entry.scene.note && (
                        <p className="text-xs text-mist-400 line-clamp-2">
                          {entry.scene.note}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        {getTreeIcon(entry.scene.treeDensity)}
                        {getPedestrianIcon(entry.scene.pedestrianStatus)}
                        {entry.scene.signText && (
                          <span className="rounded bg-teal-800/60 px-1.5 py-0.5 text-[10px] text-mist-300">
                            {entry.scene.signText}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* 登记封路 */}
      {showClosureForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowClosureForm(false)}
        >
          <form
            onSubmit={handleRegister}
            onClick={(e) => e.stopPropagation()}
            className="relative mx-4 w-full max-w-md animate-scale-in rounded-2xl border border-amber-500/30 bg-teal-900 p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setShowClosureForm(false)}
              className="absolute right-4 top-4 text-mist-400 hover:text-mist-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <Ban className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-amber-300">登记线路封路</h2>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-mist-300">
                  <Route className="w-3 h-3" />线路
                </label>
                <input
                  className="w-full rounded-xl border border-teal-800 bg-teal-950 px-3 py-2 text-sm text-mist-100 outline-none focus:border-amber-500/60"
                  value={closureRoute}
                  onChange={(e) => {
                    setClosureRoute(e.target.value)
                    setFormHint('')
                  }}
                  placeholder="输入或选择线路名"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-mist-300">
                  <AlertTriangle className="w-3 h-3" />封路原因
                </label>
                <textarea
                  className="h-20 w-full resize-none rounded-xl border border-teal-800 bg-teal-950 px-3 py-2 text-sm text-mist-100 outline-none focus:border-amber-500/60"
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  placeholder="如：道路施工，预计停运两日"
                  required
                />
              </div>
              {formHint && (
                <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  {formHint}
                </p>
              )}
              <p className="text-xs text-mist-500">
                同一线路只保留一个未恢复的封路；恢复后新旧窗景仍按原时间排成一条线。
              </p>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/80 py-2.5 text-sm font-medium text-teal-950 transition-colors hover:bg-amber-500"
              >
                <Ban className="w-4 h-4" />
                确认封路
              </button>
            </div>
          </form>
        </div>
      )}

      {detailScene && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setDetailScene(null)}
        >
          <div
            className="relative mx-4 w-full max-w-md animate-scale-in rounded-2xl border border-teal-700 bg-teal-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDetailScene(null)}
              className="absolute right-4 top-4 text-mist-400 hover:text-mist-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              {getWeatherIcon(detailScene.weather)}
              <h2 className="text-xl font-bold text-dusk-400">{detailScene.segment}</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-mist-300">
                <MapPin className="w-4 h-4 text-dusk-400" />
                <span>{detailScene.routeName}</span>
                <span className="text-teal-600">·</span>
                <span>{detailScene.seatDirection}侧</span>
              </div>
              <div className="flex items-center gap-2 text-mist-300">
                <Clock className="w-4 h-4 text-dusk-400" />
                <span>{formatTimestamp(detailScene.timestamp)}</span>
                <span className="text-teal-600">·</span>
                <span>{getTimeOfDay(detailScene.timestamp)}</span>
              </div>
              <div className="flex items-center gap-3 text-mist-300">
                {getTreeIcon(detailScene.treeDensity)}
                <span>{detailScene.treeDensity}</span>
                {getPedestrianIcon(detailScene.pedestrianStatus)}
                <span>{detailScene.pedestrianStatus}</span>
              </div>
              {detailScene.signText && (
                <div className="rounded-lg bg-teal-800/50 px-3 py-2 text-mist-200">
                  招牌: {detailScene.signText}
                </div>
              )}
              {detailScene.note && (
                <div className="rounded-lg border border-teal-800 px-3 py-2 text-mist-300">
                  {detailScene.note}
                </div>
              )}
            </div>

            <button
              onClick={() => handleDelete(detailScene.id)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-red-900/40 py-2.5 text-sm text-red-300 transition-colors hover:bg-red-900/60"
            >
              <Trash2 className="w-4 h-4" />
              删除此窗景
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ClosureTimelineItem({ closure }: { closure: ClosureRecord }) {
  const active = closure.reopenedAt === null
  return (
    <div className="relative flex gap-4">
      <div
        className={`absolute -left-[22px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-teal-950 ${
          active ? 'bg-amber-500' : 'bg-amber-700/70'
        }`}
      />
      <div className="w-20 shrink-0 pt-0.5 text-right">
        <p className="text-xs text-amber-400">
          {formatTimestamp(closure.closedAt)}
        </p>
        <p className="mt-0.5 flex items-center justify-end gap-0.5 text-[10px] text-mist-500">
          {active ? (
            <>
              <Ban className="w-2.5 h-2.5" />封路中
            </>
          ) : (
            <Construction className="w-2.5 h-2.5" />
          )}
        </p>
      </div>
      <div
        className={`flex-1 rounded-xl border px-4 py-3 ${
          active
            ? 'border-amber-500/40 bg-amber-500/10'
            : 'border-amber-700/25 bg-amber-900/10'
        }`}
      >
        <div className="flex items-center gap-2">
          {active ? (
            <Ban className="w-4 h-4 text-amber-400" />
          ) : (
            <Construction className="w-4 h-4 text-amber-600" />
          )}
          <span className={`text-sm font-semibold ${active ? 'text-amber-200' : 'text-amber-300/80'}`}>
            {active ? '线路封路中' : '封路（已恢复）'}
          </span>
        </div>
        {closure.reason && (
          <p className="mt-1.5 text-xs text-mist-300">{closure.reason}</p>
        )}
        <p className="mt-1.5 text-[11px] text-mist-500">
          {active ? (
            <>自 {formatTimestamp(closure.closedAt)} 起暂停采样</>
          ) : (
            <>
              {formatTimestamp(closure.closedAt)} — {formatTimestamp(closure.reopenedAt as string)}
              <span className="mx-1 text-teal-700">·</span>
              持续 {formatDuration(closure.closedAt, closure.reopenedAt as string)}
            </>
          )}
        </p>
      </div>
    </div>
  )
}
