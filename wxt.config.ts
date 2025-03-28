import { defineConfig } from 'wxt'
import path from 'node:path'

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-vue', '@wxt-dev/unocss'],
  manifest: {
    permissions: ['activeTab', 'storage', 'alarms'],
    host_permissions: ['https://x.com/*'],
  },
  unocss: {
    configOrPath: path.resolve(__dirname, 'unocss.config.ts'),
  },
})
