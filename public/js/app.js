import {fetchProjectInfo} from './util.js'
const { defineComponent, h, onMounted } = Vue
const {RouterView} = VueRouter


export default defineComponent({
    name: 'App',
    setup() {
        onMounted(() => {
            fetchProjectInfo()
        })
        return () => h(RouterView)
    }
})
