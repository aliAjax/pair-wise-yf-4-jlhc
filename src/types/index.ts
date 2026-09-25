export type SeatDirection = '左' | '右'

export type Weather = '晴' | '多云' | '阴' | '小雨' | '大雨' | '雪' | '雾'

export type TreeDensity = '稀疏' | '适中' | '茂密'

export type PedestrianStatus = '稀少' | '零星' | '密集'

export interface WindowScene {
  id: string
  routeName: string
  segment: string
  seatDirection: SeatDirection
  timestamp: string
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
}

export interface SceneFormData {
  routeName: string
  segment: string
  seatDirection: SeatDirection
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
}

/**
 * 线路封路记录。
 * 已恢复（recoveredAt 非空）的记录会保留在时间线上，用于呈现采样空档；
 * recoveredAt 为 null 表示该线路当前仍在封路中，同一线路至多只有一条这样的记录。
 */
export interface RouteClosure {
  id: string
  routeName: string
  reason: string
  closedAt: string
  recoveredAt: string | null
}
