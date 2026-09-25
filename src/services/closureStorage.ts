import type { RouteClosure } from '@/types'

const CLOSURE_KEY = 'bus_route_closures'

function readAll(): RouteClosure[] {
  try {
    const raw = localStorage.getItem(CLOSURE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RouteClosure[]) : []
  } catch {
    return []
  }
}

function writeAll(closures: RouteClosure[]): void {
  localStorage.setItem(CLOSURE_KEY, JSON.stringify(closures))
}

export function getAllClosures(): RouteClosure[] {
  return readAll().sort(
    (a, b) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime()
  )
}

/** 返回当前仍在封路中的记录（recoveredAt 为 null）。 */
export function getActiveClosures(): RouteClosure[] {
  return readAll()
    .filter((c) => c.recoveredAt === null)
    .sort((a, b) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime())
}

export function getActiveClosure(routeName: string): RouteClosure | null {
  return (
    readAll().find(
      (c) => c.routeName === routeName && c.recoveredAt === null
    ) ?? null
  )
}

export function getClosuresByRoute(routeName: string): RouteClosure[] {
  return readAll()
    .filter((c) => c.routeName === routeName)
    .sort(
      (a, b) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime()
    )
}

/**
 * 为线路登记一条封路。
 * 同一线路只允许存在一个未恢复的封路：若已存在则原样返回，不重复登记。
 */
export function openClosure(routeName: string, reason: string): RouteClosure {
  const closures = readAll()
  const existing = closures.find(
    (c) => c.routeName === routeName && c.recoveredAt === null
  )
  if (existing) return existing

  const closure: RouteClosure = {
    id: crypto.randomUUID(),
    routeName,
    reason,
    closedAt: new Date().toISOString(),
    recoveredAt: null,
  }
  closures.push(closure)
  writeAll(closures)
  return closure
}

/** 恢复指定封路记录；返回是否成功恢复（已恢复/不存在时返回 false）。 */
export function recoverClosure(id: string): boolean {
  const closures = readAll()
  const target = closures.find((c) => c.id === id)
  if (!target || target.recoveredAt !== null) return false
  target.recoveredAt = new Date().toISOString()
  writeAll(closures)
  return true
}
