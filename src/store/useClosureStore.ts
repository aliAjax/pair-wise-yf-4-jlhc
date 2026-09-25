import { create } from 'zustand'
import type { ClosureRecord } from '@/types'
import {
  getAllClosures,
  getAllClosedRouteNames,
  getActiveClosure as storageGetActiveClosure,
  getClosuresByRoute,
  openClosure as storageOpenClosure,
  reopenRoute as storageReopenRoute,
} from '@/services/closureStorage'

interface ClosureState {
  closures: ClosureRecord[]
  closedRouteNames: string[]

  loadClosures: () => void
  /**
   * 登记封路。
   * 已存在未恢复封路时不新建，返回既有记录并以 same: true 标识。
   */
  registerClosure: (
    routeName: string,
    reason: string
  ) => { record: ClosureRecord; same: boolean }
  /** 恢复通行，返回被恢复的记录；无未恢复封路时返回 null */
  reopen: (routeName: string) => ClosureRecord | null
  getActiveClosure: (routeName: string) => ClosureRecord | null
  getRouteClosures: (routeName: string) => ClosureRecord[]
}

export const useClosureStore = create<ClosureState>((set, get) => ({
  closures: [],
  closedRouteNames: [],

  loadClosures: () => {
    set({
      closures: getAllClosures(),
      closedRouteNames: getAllClosedRouteNames(),
    })
  },

  registerClosure: (routeName, reason) => {
    const existing = storageGetActiveClosure(routeName.trim())
    const record = storageOpenClosure(routeName, reason)
    get().loadClosures()
    return { record, same: existing !== null }
  },

  reopen: (routeName) => {
    const record = storageReopenRoute(routeName)
    if (record) get().loadClosures()
    return record
  },

  getActiveClosure: (routeName) => storageGetActiveClosure(routeName),
  getRouteClosures: (routeName) => getClosuresByRoute(routeName),
}))
