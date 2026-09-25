/** 线路封路记录：一次「封路 → 恢复」对应一条记录 */
export interface ClosureRecord {
  id: string
  routeName: string
  /** 封路开始时间（ISO） */
  closedAt: string
  /** 封路原因 */
  reason: string
  /** 恢复通行时间（ISO），未恢复时为 null */
  reopenedAt: string | null
}
