import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
// eslint-disable-next-line import/no-unresolved
import '@unocss/reset/normalize.css'
import 'virtual:uno.css'

const app = createApp(App)
app.mount('#app')
