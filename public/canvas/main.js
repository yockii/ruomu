import App from "./app.js"
import piniaShare from "./piniaShare.js";

const { createPinia } = Pinia;
const pinia = createPinia()
pinia.use(piniaShare);

const { createApp } = Vue;
const app = createApp(App)
app.use(pinia)
app.use(naive)
app.mount('#app')