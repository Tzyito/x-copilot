import type { CleanupConfig } from '../../types'
import { storage } from 'wxt/storage'
import { ContentStorage } from '@/utils/storage'

export const CLEANUP_PERIODS = {
  '1w': 7 * 24 * 60 * 60 * 1000,
  '1m': 30 * 24 * 60 * 60 * 1000,
  '3m': 90 * 24 * 60 * 60 * 1000,
  '1y': 365 * 24 * 60 * 60 * 1000,
} as const

export async function cleanupHistory() {
  const config = await storage.getItem<CleanupConfig>('local:cleanupConfig')
  if (!config || config.period === 'never') return

  const now = Date.now()
  const cutoff = now - CLEANUP_PERIODS[config.period]
  const history = (await ContentStorage.getAllRecords()) || []
  const filteredHistory = history.filter((record) => record.timestamp > cutoff)

  if (filteredHistory.length !== history.length) {
    await ContentStorage.setAllRecords(filteredHistory)
    return filteredHistory
  }
  return null
}
