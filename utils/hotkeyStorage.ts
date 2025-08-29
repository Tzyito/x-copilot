import { storage } from 'wxt/storage'
import type { HotkeyConfig, HotkeyAction } from '@/types'

export const DEFAULT_HOTKEY_CONFIG: HotkeyConfig = {
  bindings: [
    {
      action: 'search',
      keys: 'Shift+K',
      description: '打开搜索面板'
    },
    {
      action: 'domSelect',
      keys: 'Shift+S', 
      description: '选择页面元素'
    }
  ]
}

class HotkeyStorageService {
  private readonly STORAGE_KEY = 'local:hotkeyConfig'

  async getHotkeyConfig(): Promise<HotkeyConfig> {
    const config = await storage.getItem<HotkeyConfig>(this.STORAGE_KEY)
    return config || DEFAULT_HOTKEY_CONFIG
  }

  async setHotkeyConfig(config: HotkeyConfig): Promise<void> {
    await storage.setItem(this.STORAGE_KEY, config)
    this.notifyHotkeyUpdate(config)
  }

  async updateHotkeyBinding(action: HotkeyAction, keys: string): Promise<void> {
    const config = await this.getHotkeyConfig()
    const binding = config.bindings.find(b => b.action === action)
    
    if (binding) {
      // 检查快捷键冲突
      const conflict = config.bindings.find(b => b.keys === keys && b.action !== action)
      if (conflict) {
        throw new Error(`快捷键 ${keys} 已被 "${conflict.description}" 使用`)
      }
      
      binding.keys = keys
      await this.setHotkeyConfig(config)
    }
  }

  async resetToDefaults(): Promise<void> {
    await this.setHotkeyConfig(DEFAULT_HOTKEY_CONFIG)
  }

  getHotkeyByAction(config: HotkeyConfig, action: HotkeyAction): string | undefined {
    return config.bindings.find(b => b.action === action)?.keys
  }

  formatKeysForMagicKeys(keys: string): string {
    return keys.replace(/\+/g, '_')
  }

  // 验证快捷键格式
  validateKeys(keys: string): boolean {
    const validModifiers = ['Ctrl', 'Alt', 'Shift', 'Meta', 'Cmd']
    const parts = keys.split('+')
    
    if (parts.length < 1) return false
    
    const mainKey = parts[parts.length - 1]
    if (!mainKey || mainKey.length === 0) return false
    
    const modifiers = parts.slice(0, -1)
    return modifiers.every(mod => validModifiers.includes(mod))
  }

  private async notifyHotkeyUpdate(config: HotkeyConfig): Promise<void> {
    try {
      const { browser } = await import('wxt/browser')
      
      const tabs = await browser.tabs.query({})
      
      for (const tab of tabs) {
        if (tab.id) {
          try {
            await browser.tabs.sendMessage(tab.id, {
              type: 'HOTKEY_CONFIG_UPDATED',
              data: config
            })
          } catch (error) {
            console.error('Failed to send message to tab:', error)
          }
        }
      }
    } catch (error) {
      console.error('Failed to notify hotkey update:', error)
    }
  }

  watchConfig(callback: (newConfig: HotkeyConfig, oldConfig?: HotkeyConfig) => void) {
    return storage.watch<HotkeyConfig>(this.STORAGE_KEY, (newValue, oldValue) => {
      const newConfig = newValue || DEFAULT_HOTKEY_CONFIG
      const oldConfig = oldValue || undefined
      callback(newConfig, oldConfig)
    })
  }
}

export const hotkeyStorage = new HotkeyStorageService()
