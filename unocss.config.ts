import {
  defineConfig,
  presetAttributify,
  presetMini,
  transformerVariantGroup,
  presetIcons,
} from 'unocss'

export default defineConfig({
  presets: [presetMini(), presetAttributify(), presetIcons()],
  transformers: [transformerVariantGroup()],
})
