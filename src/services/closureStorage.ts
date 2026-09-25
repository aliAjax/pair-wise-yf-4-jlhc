import type { ClosureRecord } from '@/types'

/**
 * 封路记录独立存储，与窗景记录（bus_window_scenes）互不影响：
 * 删除窗景记录不会改动任何封路状态。
 */
const CLOSURE_STORAGE_KEY = 'bus_route_closures'

function readAll(): ClosureRecord[] {
  try {
    const raw = localStorage.getItem(CLOSURE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ClosureRecord[]) : []
  } catch {
    return []
  }
}

function writeAll(records: ClosureRecord[]): void {
  localStorage.setItem(CLOSURE_STORAGE_KEY, JSON.stringify(records))
}

export function getAllClosures(): ClosureRecord[] {
  return readAll()
}

/** 获取某条线路当前未恢复的封路；没有则返回 null。同一线路至多一条。 */
export function getActiveClosure(routeName: string): ClosureRecord | null {
  const name = routeName.trim()
  if (!name) return null
  return (
    readAll().find(
      (c) => c.routeName === name && c.reopenedAt === null
    ) ?? null
  )
}

/** 某条线路是否正处在封路中 */
export function isRouteClosed(routeName: string): boolean {
  return getActiveClosure(routeName) !== null
}

/**
 * 为线路登记一条封路记录。
 * 若该线路已有未恢复的封路，则不新建，直接返回既有记录（由调用方提示）。
 */
export function openClosure(routeName: string, reason: string): ClosureRecord {
  const name = routeName.trim()
  const existing = getActiveClosure(name)
  if (existing) return existing

  const record: ClosureRecord = {
    id: crypto.randomUUID(),
    routeName: name,
    closedAt: new Date().toISOString(),
    reason: reason.trim(),
    reopenedAt: null,
  }
  const records = readAll()
  records.push(record)
  writeAll(records)
  return record
}

/**
 * 恢复某条线路当前未恢复的封路。
 * 返回被恢复的记录；该线路没有封路时返回 null。
 */
export function reopenRoute(routeName: string): ClosureRecord | null {
  const name = routeName.trim()
  const records = readAll()
  const target = records.find(
    (c) => c.routeName === name && c.reopenedAt === null
  )
  if (!target) return null
  target.reopenedAt = new Date().toISOString()
  writeAll(records)
  return target
}

/** 按线路取封路记录，封路时间新的在前 */
export function getClosuresByRoute(routeName: string): ClosureRecord[] {
  const name = routeName.trim()
  return readAll()
    .filter((c) => c.routeName === name)
    .sort(
      (a, b) =>
        new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime()
    )
}

/** 所有出现过封路记录的线路名（含已恢复的） */
export function getAllClosedRouteNames(): string[] {
  return Array.from(new Set(readAll().map((c) => c.routeName))).sort()
}
