import { create } from 'zustand'
import type { WindowScene, SceneFormData, RouteClosure } from '@/types'
import {
  getAllScenes,
  saveScene as storageSaveScene,
  deleteScene as storageDeleteScene,
  getScenesByRoute,
  getAllRouteNames,
  getRandomScene,
} from '@/services/storage'
import {
  getAllClosures,
  getActiveClosure,
  openClosure as storageOpenClosure,
  recoverClosure as storageRecoverClosure,
} from '@/services/closureStorage'

/** 保存窗景的结果：封路中的线路会被拦下并附带原因。 */
export type SaveResult = { ok: true } | { ok: false; reason: string }

interface SceneState {
  scenes: WindowScene[]
  routeNames: string[]
  currentRouteScenes: WindowScene[]
  currentRouteClosures: RouteClosure[]
  selectedRoute: string
  randomScene: WindowScene | null
  closures: RouteClosure[]

  loadAll: () => void
  saveScene: (data: SceneFormData) => SaveResult
  deleteScene: (id: string) => void
  selectRoute: (routeName: string) => void
  refreshRandom: () => void
  registerClosure: (routeName: string, reason: string) => RouteClosure
  restoreClosure: (id: string) => void
  getActiveClosureFor: (routeName: string) => RouteClosure | null
}

function mergeRouteNames(sceneRoutes: string[], closures: RouteClosure[]): string[] {
  return Array.from(
    new Set([...sceneRoutes, ...closures.map((c) => c.routeName)])
  ).sort()
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scenes: [],
  routeNames: [],
  currentRouteScenes: [],
  currentRouteClosures: [],
  selectedRoute: '',
  randomScene: null,
  closures: [],

  loadAll: () => {
    const scenes = getAllScenes()
    const closures = getAllClosures()
    const routeNames = mergeRouteNames(getAllRouteNames(), closures)
    set((state) => ({
      scenes,
      closures,
      routeNames,
      currentRouteScenes: state.selectedRoute
        ? getScenesByRoute(state.selectedRoute)
        : [],
      currentRouteClosures: state.selectedRoute
        ? closures.filter((c) => c.routeName === state.selectedRoute)
        : [],
    }))
  },

  saveScene: (data) => {
    // 封路中的线路禁止继续采样，并把封路原因交还给页面展示
    const closure = getActiveClosure(data.routeName)
    if (closure) {
      return { ok: false, reason: closure.reason }
    }

    const scene: WindowScene = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    storageSaveScene(scene)
    const scenes = getAllScenes()
    const closures = getAllClosures()
    const routeNames = mergeRouteNames(getAllRouteNames(), closures)
    set((state) => {
      const currentRouteScenes = state.selectedRoute
        ? getScenesByRoute(state.selectedRoute)
        : []
      return { scenes, closures, routeNames, currentRouteScenes }
    })
    return { ok: true }
  },

  deleteScene: (id) => {
    // 只删窗景记录；封路状态独立存储，不受影响
    storageDeleteScene(id)
    const scenes = getAllScenes()
    const closures = get().closures
    const routeNames = mergeRouteNames(getAllRouteNames(), closures)
    set((state) => {
      const currentRouteScenes = state.selectedRoute
        ? getScenesByRoute(state.selectedRoute)
        : []
      return { scenes, routeNames, currentRouteScenes }
    })
  },

  selectRoute: (routeName) => {
    const currentRouteScenes = routeName ? getScenesByRoute(routeName) : []
    const currentRouteClosures = routeName
      ? getAllClosures().filter((c) => c.routeName === routeName)
      : []
    set({ selectedRoute: routeName, currentRouteScenes, currentRouteClosures })
  },

  refreshRandom: () => {
    const randomScene = getRandomScene()
    set({ randomScene })
  },

  registerClosure: (routeName, reason) => {
    const closure = storageOpenClosure(routeName, reason)
    const closures = getAllClosures()
    const routeNames = mergeRouteNames(getAllRouteNames(), closures)
    set((state) => ({
      closures,
      routeNames,
      currentRouteClosures:
        state.selectedRoute === routeName
          ? closures.filter((c) => c.routeName === routeName)
          : state.currentRouteClosures,
    }))
    return closure
  },

  restoreClosure: (id) => {
    storageRecoverClosure(id)
    const closures = getAllClosures()
    set((state) => ({
      closures,
      currentRouteClosures: state.selectedRoute
        ? closures.filter((c) => c.routeName === state.selectedRoute)
        : [],
    }))
  },

  getActiveClosureFor: (routeName) => getActiveClosure(routeName),
}))
