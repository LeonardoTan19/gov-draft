import { createPinia } from 'pinia'
import { i18n } from './locales'
import { createApp } from 'vue'
import App from './App.vue'
import './assets/styles/main.scss'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.mount('#app')
