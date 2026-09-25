import { useState, useEffect } from 'react'
import { Bus, MapPin, Armchair, Clock, CloudSun, Signpost, TreePine, Users, FileText, Send, Ban } from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import { useClosureStore } from '@/store/useClosureStore'
import { getWeatherIcon, getTreeIcon, getPedestrianIcon, formatTimestamp } from '@/utils/sceneHelpers'
import type { SceneFormData, Weather, TreeDensity, PedestrianStatus, SeatDirection } from '@/types'

const WEATHERS: Weather[] = ['晴', '多云', '阴', '小雨', '大雨', '雪', '雾']
const TREES: TreeDensity[] = ['稀疏', '适中', '茂密']
const PEDESTRIANS: PedestrianStatus[] = ['稀少', '零星', '密集']

const initialForm: SceneFormData = {
  routeName: '',
  segment: '',
  seatDirection: '左',
  weather: '晴',
  signText: '',
  treeDensity: '适中',
  pedestrianStatus: '稀少',
  note: '',
}

export default function RecordPage() {
  const saveScene = useSceneStore((s) => s.saveScene)
  const loadAll = useSceneStore((s) => s.loadAll)
  const loadClosures = useClosureStore((s) => s.loadClosures)
  const getActiveClosure = useClosureStore((s) => s.getActiveClosure)
  const [form, setForm] = useState<SceneFormData>(initialForm)
  const [now, setNow] = useState(new Date())
  const [showSuccess, setShowSuccess] = useState(false)
  const [blockReason, setBlockReason] = useState<string | null>(null)

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => { loadClosures() }, [loadClosures])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  const update = <K extends keyof SceneFormData>(key: K, val: SceneFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }))
    if (key === 'routeName') setBlockReason(null)
  }

  // 处在封路中的线路，记录页保存时需要拦住
  const activeClosure = form.routeName.trim()
    ? getActiveClosure(form.routeName.trim())
    : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const closure = getActiveClosure(form.routeName.trim())
    if (closure) {
      setBlockReason(closure.reason)
      return
    }
    saveScene(form)
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setForm(initialForm)
    }, 1500)
  }

  return (
    <div className="relative min-h-screen bg-teal-950 p-4 pb-24">
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-bounce flex flex-col items-center gap-2 opacity-0" style={{ animation: 'fadeInUp 1.5s ease forwards' }}>
            <Bus className="w-16 h-16 text-dusk-400" />
            <span className="text-mist-100 font-serif text-lg">记录已保存</span>
          </div>
          <style>{`@keyframes fadeInUp { 0% { opacity:0; transform:translateY(20px) } 40% { opacity:1; transform:translateY(0) } 100% { opacity:0; transform:translateY(-40px) } }`}</style>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Bus className="w-6 h-6 text-dusk-400" />
          <h1 className="text-mist-100 font-serif text-2xl">窗景记录</h1>
        </div>

        <section className="space-y-3">
          <h2 className="text-dusk-400 font-serif text-lg flex items-center gap-2">
            <MapPin className="w-4 h-4" />路线信息
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><Bus className="w-3 h-3" />线路</label>
              <input className={`w-full bg-teal-850 text-mist-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 ${activeClosure ? 'border border-amber-500/70 focus:ring-amber-500' : 'focus:ring-dusk-400'}`} value={form.routeName} onChange={(e) => update('routeName', e.target.value)} required />
              {activeClosure && (
                <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1.5 text-xs text-amber-300">
                  <Ban className="mt-0.5 w-3 h-3 shrink-0" />
                  <span>
                    该线路正在封路中，暂无法保存记录
                    {activeClosure.reason && `（原因：${activeClosure.reason}）`}
                  </span>
                </p>
              )}
            </div>
            <div>
              <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />区间</label>
              <input className="w-full bg-teal-850 text-mist-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-dusk-400" value={form.segment} onChange={(e) => update('segment', e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><Armchair className="w-3 h-3" />座位方向</label>
            <div className="flex gap-2">
              {(['左', '右'] as SeatDirection[]).map((d) => (
                <button key={d} type="button" onClick={() => update('seatDirection', d)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${form.seatDirection === d ? 'bg-dusk-400/20 text-dusk-400 border border-dusk-400' : 'bg-teal-850 text-mist-300 border border-transparent'}`}>
                  {d}侧
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-dusk-400 font-serif text-lg flex items-center gap-2">
            <CloudSun className="w-4 h-4" />窗景信息
          </h2>
          <div>
            <label className="text-mist-300 text-xs mb-1 block">天气</label>
            <div className="grid grid-cols-4 gap-2">
              {WEATHERS.map((w) => (
                <button key={w} type="button" onClick={() => update('weather', w)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition ${form.weather === w ? 'bg-dusk-400/20 border border-dusk-400 text-dusk-400' : 'bg-teal-850 border border-transparent text-mist-300'}`}>
                  {getWeatherIcon(w)}{w}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><Signpost className="w-3 h-3" />招牌文字</label>
            <input className="w-full bg-teal-850 text-mist-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-dusk-400" value={form.signText} onChange={(e) => update('signText', e.target.value)} />
          </div>
          <div>
            <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><TreePine className="w-3 h-3" />树木密度</label>
            <div className="grid grid-cols-3 gap-2">
              {TREES.map((t) => (
                <button key={t} type="button" onClick={() => update('treeDensity', t)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs transition ${form.treeDensity === t ? 'bg-dusk-400/20 border border-dusk-400 text-dusk-400' : 'bg-teal-850 border border-transparent text-mist-300'}`}>
                  {getTreeIcon(t)}{t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-mist-300 text-xs mb-1 flex items-center gap-1"><Users className="w-3 h-3" />行人状态</label>
            <div className="grid grid-cols-3 gap-2">
              {PEDESTRIANS.map((p) => (
                <button key={p} type="button" onClick={() => update('pedestrianStatus', p)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs transition ${form.pedestrianStatus === p ? 'bg-dusk-400/20 border border-dusk-400 text-dusk-400' : 'bg-teal-850 border border-transparent text-mist-300'}`}>
                  {getPedestrianIcon(p)}{p}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-dusk-400 font-serif text-lg flex items-center gap-2">
            <FileText className="w-4 h-4" />观察笔记
          </h2>
          <textarea className="w-full bg-teal-850 text-mist-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-dusk-400 resize-none h-24" value={form.note} onChange={(e) => update('note', e.target.value)} />
        </section>

        <div className="flex items-center gap-2 text-mist-400 text-xs">
          <Clock className="w-3 h-3" />
          <span>{formatTimestamp(now.toISOString())}</span>
        </div>

        {blockReason !== null && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <Ban className="mt-0.5 w-4 h-4 shrink-0 text-amber-400" />
            <div>
              <p className="font-medium">线路封路中，记录未保存</p>
              <p className="mt-0.5 text-xs text-amber-300/90">
                {blockReason
                  ? `封路原因：${blockReason}`
                  : '该线路尚未恢复通行，请在时间线页恢复后再记录'}
              </p>
            </div>
          </div>
        )}

        <button type="submit"
          className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition ${activeClosure ? 'bg-teal-800 text-mist-400 cursor-not-allowed' : 'bg-dusk-400 text-teal-950'}`}>
          <Send className="w-4 h-4" />{activeClosure ? '线路封路中，无法保存' : '保存记录'}
        </button>
      </form>
    </div>
  )
}
