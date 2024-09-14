import { useProjectStore } from './store.js'

const { defineComponent, h, onMounted, getCurrentInstance, ref } = Vue
const { storeToRefs } = Pinia

const parseStyles = (styles = '') => {
    return styles
        .split(';')
        .filter((style) => style.split(':').length === 2)
        .map((style) => {
            const [key, value] = style.split(':')
            return [
                key.trim().replace(/-./g, (s) => s.charAt(1).toUpperCase()),
                value.trim(),
            ]
        })
        .reduce((styleObj, style) => ({
            ...styleObj,
            [style[0]]: style[1],
        }), {})
}

export default defineComponent({
    name: 'App',
    setup() {
        const projectStore = useProjectStore()
        const { currentPageSchema } = storeToRefs(projectStore)

        const { appContext } = getCurrentInstance()
        const globalComponents = appContext.components;

        const fetchProjectPages = async () => {
            try {
                const resp = await axios.get("./page/list", {params: {projectId, offset: -1, limit: -1}})
                projectStore.pages = resp.data.data.items

                fetchPageSchema(projectStore.pages[0].id)
            } catch (e) {
                console.error(e)
            }
        }

        const fetchPageSchema = async (pageId) => {
            try {
                const resp = await axios.get("./page/schema", {params: {pageId}})
                const schema = resp.data.data
                projectStore.currentPageSchema = schema
                projectStore.pages.find(page => page.id === pageId).schema = schema
            } catch (e) {
                console.error(e)
            }
        }


        const createStateProps = (stateItem) => {
            const props = {}
            if(stateItem.props) {
                stateItem.props.forEach(item => {
                    const name = item.name
                    switch (item.type) {
                        case 'string':
                            props[name] = item.defaultValue || ''
                            break
                        case 'boolean':
                            props[name] = !!item.defaultValue || false
                            break
                        case 'number':
                            props[name] = Number(item.defaultValue) || 0
                            break
                        case 'object':
                            props[name] = createStateProps(item)
                            break
                        case 'array':
                            props[name] = []
                            break
                        default:
                            props[name] = null
                    }
                })
            }
            return props
        }
        const createReactiveState = (stateJson) => {
            const state = reactive({})
            stateJson && stateJson.forEach(item => {
                const name = item.name
                switch (item.type) {
                    case 'string':
                        state[name] = item.defaultValue || ''
                        break
                    case 'boolean':
                        state[name] = !!item.defaultValue || false
                        break
                    case 'number':
                        state[name] = Number(item.defaultValue) || 0
                        break
                    case 'object':
                        state[name] = createStateProps(item)
                        break
                    case 'array':
                        state[name] = []
                        break
                    default:
                        state[name] = null
                }
            })
            return state
        }

        const state = createReactiveState(currentPageSchema.value.state)

        const functionList = {}
        if (currentPageSchema.value.js && currentPageSchema.value.js.methods) {
            for (const item of currentPageSchema.value.js.methods) {
                functionList[item.id] = (...args) => {
                    return new Function('state', ...item.params, item.code)(state, ...args)
                }
            }
        }



        const render = (schema) => {
            let children = {}
            if(schema.slots) {
                for (const slot of schema.slots) {
                    const slotChildren = []
                    if (slot.children) {
                        // slot: schema[] | string
                        if (typeof slot.children === 'string') {
                            slotChildren.push(slot.children)
                        } else {
                            for (const node of slot.children) {
                                slotChildren.push(render(node))
                            }
                        }
                    }
                    children[slot.name] = slotChildren
                }
            }
            if (schema.children && schema.children.length > 0) {
                const defaultSlotChildren = []
                if (schema.children && schema.children.length > 0) {
                    for (const node of schema.children) {
                        defaultSlotChildren.push(render(node))
                    }
                }
                children.default = () => defaultSlotChildren
            }

            const schemaProps = schema.props
            const eventProps = {}
            if (schema.events) {
                for (const event of schema.events) {
                    eventProps[event.eventName] = functionList[event.methodId]
                }
            }
            let props = {
                ...schemaProps,
                ...eventProps,
            }

            // 如果组件有独立的style属性
            if (schema.style) {
                if (props.style) {
                    // 如果已经有style属性，则合并，但注意，schema.style是字符串，需要转换为对象
                    props.style = {
                        ...props.style,
                        ...parseStyles(schema.style)
                    }
                } else {
                    props.style = parseStyles(schema.style)
                }
            }

            const comp = globalComponents[schema.tagName]
            let result
            if (comp) {
                result = h(comp, props, children)
            } else {
                result = h(schema.tagName, props, children)
            }

            return result
        }

        const Container = () => {
            const children = []
            if (currentPageSchema.value && currentPageSchema.value.children) {
                for (const node of currentPageSchema.value.children) {
                    children.push(render(node))
                }
            }
            return h('div', {}, children)
        }

        onMounted(() => {
            fetchProjectPages()
        })
        return () => h(Container)
    }
})
