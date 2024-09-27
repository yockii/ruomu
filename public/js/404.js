const { defineComponent, h} = Vue
export default defineComponent({
    name: '404',
    setup() {

        return () => h('div', '404 Not Found')
    }
})