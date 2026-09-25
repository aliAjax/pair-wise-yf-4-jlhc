import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Route,
  X,
  Trash2,
  Clock,
  MapPin,
  Construction,
  PlayCircle,
} from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import {
  formatTimestamp,
  getTimeOfDay,
  getWeatherIcon,
  getTreeIcon,
  getPedestrianIcon,
} from '@/utils/sceneHelpers'
import type { WindowScene, RouteClosure } from '@/types'

type TimelineItem =
  | { kind: 'scene'; key: string; time: string; scene: WindowScene }
  | { kind: 'closure'; key: string; time: string; closure: RouteClosure }

export default function TimelinePage() {
  const {
    routeNames,
    selectedRoute,
    currentRouteScenes,
    currentRouteClosures,
    closures,
    selectRoute,
    loadAll,
    deleteScene,
    registerClosure,
    restoreClosure,
    getActiveClosureFor,
  } = useSceneStore()
  const [search, setSearch] = useState('')
  const [detailScene, setDetailScene] = useState<WindowScene | null>(null)
  const [closureRoute, setClosureRoute] = useState('')
  const [closureReason, setClosureReason] = useState('')

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // 选中线路变化时，把封路登记表单的线路名同步过去（仍可手动修改）
  useEffect(() => {
    setClosureRoute(selectedRoute)
  }, [selectedRoute])

  const filteredRoutes = routeNames.filter((r) =>
    r.toLowerCase().includes(search.toLowerCase())
  )

  const activeRouteSet = useMemo(
    () =>
      new Set(
        closures.filter((c) => c.recoveredAt === null).map((c) => c.routeName)
      ),
    [closures]
  )

  // 窗景与封路记录按同一时间轴合并：封路作为采样空档插在新旧窗景之间
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...currentRouteScenes.map((scene) => ({
        kind: 'scene' as const,
        key: scene.id,
        time: scene.timestamp,
        scene,
      })),
      ...currentRouteClosures.map((closure) => ({
        kind: 'closure' as const,
        key: `closure-${closure.id}`,
        time: closure.closedAt,
        closure,
      })),
    ]
    return items.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    )
  }, [currentRouteScenes, currentRouteClosures])

  const selectedActiveClosure = selectedRoute
    ? getActiveClosureFor(selectedRoute)
    : null
  const typedActiveClosure = closureRoute.trim()
    ? getActiveClosureFor(closureRoute.trim())
    : null

  const handleDelete = (id: string) => {
    deleteScene(id)
    setDetailScene(null)
  }

  const handleRegisterClosure = (e: React.FormEvent) => {
    e.preventDefault()
    const route = closureRoute.trim()
    if (!route || typedActiveClosure) return
    registerClosure(route, closureReason.trim() || '临时封路')
    setClosureReason('')
    selectRoute(route)
  }

  const handleRecover = (closure: RouteClosure) => {
    if (window.confirm(`确认「${closure.routeName}」已恢复通行？`)) {
      restoreClosure(closure.id)
    }
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
          <div className="flex flex-wrap gap-2">
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
            {filteredRoutes.map((name) => (
              <button
                key={name}
                onClick={() => selectRoute(name)}
                className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                  selectedRoute === name
                    ? 'bg-dusk-400 text-teal-950'
                    : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
                }`}
              >
                <Route className="w-3 h-3" />
                {name}
                {activeRouteSet.has(name) && (
                  <span
                    className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400"
                    title="封路中"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 封路登记与恢复 */}
        <section className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          {selectedActiveClosure ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Construction className="mt-0.5 w-5 h-5 shrink-0 text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-amber-200">
                    「{selectedActiveClosure.routeName}」封路中
                  </p>
                  <p className="mt-0.5 text-xs text-amber-200/70">
                    {formatTimestamp(selectedActiveClosure.closedAt)} 起 ·{' '}
                    {selectedActiveClosure.reason}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRecover(selectedActiveClosure)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs text-amber-200 transition-colors hover:bg-amber-500/30"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                恢复通行
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegisterClosure} className="space-y-2.5">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-200/90">
                <Construction className="w-4 h-4" />
                登记线路封路
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={closureRoute}
                  onChange={(e) => setClosureRoute(e.target.value)}
                  placeholder="线路名"
                  className="min-w-0 flex-1 rounded-lg border border-teal-700/60 bg-teal-900/70 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-500 focus:border-amber-400/60 focus:outline-none"
                />
                <input
                  type="text"
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  placeholder="封路原因（选填）"
                  className="min-w-0 flex-[2] rounded-lg border border-teal-700/60 bg-teal-900/70 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-500 focus:border-amber-400/60 focus:outline-none"
                />
              </div>
              {typedActiveClosure ? (
                <p className="text-xs text-amber-300/80">
                  「{closureRoute.trim()}」已有未恢复的封路，请先恢复后再登记
                </p>
              ) : null}
              <button
                type="submit"
                disabled={!closureRoute.trim() || !!typedActiveClosure}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs text-amber-200 transition-colors hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Construction className="w-3.5 h-3.5" />
                登记封路
              </button>
            </form>
          )}
        </section>

        {timeline.length === 0 ? (
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
              {timeline.map((item) =>
                item.kind === 'closure' ? (
                  <ClosureEntry key={item.key} closure={item.closure} onRecover={handleRecover} />
                ) : (
                  <SceneEntry
                    key={item.key}
                    scene={item.scene}
                    onOpen={() => setDetailScene(item.scene)}
                  />
                )
              )}
            </div>
          </div>
        )}
      </div>

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

function SceneEntry({
  scene,
  onOpen,
}: {
  scene: WindowScene
  onOpen: () => void
}) {
  return (
    <div className="relative flex gap-4">
      <div className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-dusk-400 ring-4 ring-teal-950" />
      <div className="w-20 shrink-0 pt-0.5 text-right">
        <p className="text-xs text-dusk-400">{formatTimestamp(scene.timestamp)}</p>
        <p className="mt-0.5 text-[10px] text-mist-500">
          {getTimeOfDay(scene.timestamp)}
        </p>
      </div>
      <button
        onClick={onOpen}
        className="group flex-1 rounded-xl border border-teal-800 bg-teal-900/50 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-dusk-400/40 hover:shadow-lg hover:shadow-dusk-400/10"
      >
        <div className="flex items-center gap-2 mb-2">
          {getWeatherIcon(scene.weather)}
          <span className="text-sm font-semibold text-mist-100">
            {scene.segment}
          </span>
        </div>
        <div className="flex items-center gap-1 mb-1.5 text-mist-400">
          <MapPin className="w-3 h-3" />
          <span className="text-xs">{scene.routeName}</span>
          <span className="mx-1 text-teal-700">·</span>
          <span className="text-xs">{scene.seatDirection}侧</span>
        </div>
        {scene.note && (
          <p className="text-xs text-mist-400 line-clamp-2">{scene.note}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          {getTreeIcon(scene.treeDensity)}
          {getPedestrianIcon(scene.pedestrianStatus)}
          {scene.signText && (
            <span className="rounded bg-teal-800/60 px-1.5 py-0.5 text-[10px] text-mist-300">
              {scene.signText}
            </span>
          )}
        </div>
      </button>
    </div>
  )
}

function ClosureEntry({
  closure,
  onRecover,
}: {
  closure: RouteClosure
  onRecover: (closure: RouteClosure) => void
}) {
  const active = closure.recoveredAt === null
  return (
    <div className="relative flex gap-4">
      <div
        className={`absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-teal-950 ${
          active ? 'bg-amber-400 animate-pulse' : 'bg-amber-600/70'
        }`}
      />
      <div className="w-20 shrink-0 pt-0.5 text-right">
        <p className="text-xs text-amber-400/90">
          {formatTimestamp(closure.closedAt)}
        </p>
      </div>
      <div
        className={`flex-1 rounded-xl border border-dashed p-4 ${
          active
            ? 'border-amber-500/50 bg-amber-500/10'
            : 'border-amber-700/40 bg-amber-900/10'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Construction
              className={`w-4 h-4 ${active ? 'text-amber-400' : 'text-amber-600/80'}`}
            />
            <span
              className={`text-sm font-semibold ${
                active ? 'text-amber-200' : 'text-amber-300/80'
              }`}
            >
              {active ? '封路中 · 采样中断' : '封路空档'}
            </span>
          </div>
          {active ? (
            <button
              onClick={() => onRecover(closure)}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-1 text-[11px] text-amber-200 transition-colors hover:bg-amber-500/30"
            >
              <PlayCircle className="w-3 h-3" />
              恢复通行
            </button>
          ) : null}
        </div>
        <p className="mt-1.5 text-xs text-amber-200/70">
          原因：{closure.reason}
        </p>
        <p className="mt-1 text-[11px] text-mist-500">
          {active
            ? `${formatTimestamp(closure.closedAt)} 起，该线路暂不采样`
            : `${formatTimestamp(closure.closedAt)} ～ ${formatTimestamp(
                closure.recoveredAt as string
              )} 封路，恢复后窗景继续按时间顺延`}
        </p>
      </div>
    </div>
  )
}
