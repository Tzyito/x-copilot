import {
  defineConfig,
  presetAttributify,
  presetWind3,
  transformerVariantGroup,
  presetIcons,
} from 'unocss'

export default defineConfig({
  presets: [presetWind3(), presetAttributify(), presetIcons()],
  transformers: [transformerVariantGroup()],
})
