import { useProjectStore } from './store.js'

const { defineComponent, h, onMounted, getCurrentInstance, reactive } = Vue
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

const getValueByPathFromState = (obj, path) => {
    // path = 'state.xxx.xxx'
    const pathArr = path.split('.')
    // 要去掉 state.
    pathArr.shift()
    return pathArr.reduce((obj, key) => obj && obj[key], obj)
}

const setValueByPathInState = (obj, path, value) => {
    const pathArr = path.split('.')
    // 要去掉 state.
    pathArr.shift()
    return pathArr.reduce((obj, key, index) => {
        if (index === pathArr.length - 1) {
            obj[key] = value
        } else {
            obj[key] = obj[key] || {}
        }
        return obj[key]
    }, obj)
}

export default defineComponent({
    name: 'App',
    setup() {
        const projectStore = useProjectStore()
        const { currentPageSchema } = storeToRefs(projectStore)

        const { appContext } = getCurrentInstance()
        const globalComponents = appContext.components;

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

        const render = (schema, slotName) => {
            let children = {}
            if(schema.slots) {
                // 有插槽，则不是children数组的形式，而是插槽键值对的形式
                for (const slot of schema.slots) {
                    const slotChildren = []
                    if (slot.children) {
                        // slot: schema[] | string
                        if (typeof slot.children === 'string') {
                            slotChildren.push(slot.children)
                        } else {
                            for (const node of slot.children) {
                                slotChildren.push(render(node, slot.name))
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


            let shouldShowDropInfo = false
            let needChildrenPlaceholder = schema.isContainer && (!schema.children || schema.children.length === 0)
            if (needChildrenPlaceholder && schema.slots) {
                // 检查是否存在default的slot
                needChildrenPlaceholder = !schema.slots.some(slot => slot.name === "default" && slot.children && slot.children.length > 0)
            } else if (schema.slots) {
                // "default" slot
                needChildrenPlaceholder = schema.slots.some(slot => slot.name === "default" && (!slot.children || slot.children.length === 0))
            }
            if (needChildrenPlaceholder) {
                shouldShowDropInfo = true
            }
            if(shouldShowDropInfo) {
                children.default = () => [
                    h('div', {
                        'data-component-id': schema.id,
                        class: 'rm-drop-info',
                        style: {
                            padding: '10px',
                            color: '#666',
                            border: '1px dashed #ccc',
                            borderRadius: '4px',
                            textAlign: 'center',
                            fontSize: '12px'
                        }
                    }, `拖拽组件到此处`)
                ]
            }

            const schemaProps = schema.props
            if(schema.relatedProps) {
                // relatedProps: { propName: {name, syncUpdate, varName}}
                for (const propName in schema.relatedProps) {
                    const prop = schema.relatedProps[propName]
                    // const propValue = state[prop.varName]
                    // prop.varName 是变量名，如：pageId 或者 page.id,但都应该在state中以对象形式存在
                    const propValue = getValueByPathFromState(state, prop.varName)
                    // propValue 可能就是false，需要传递
                    schemaProps[propName] = propValue

                    if (prop.syncUpdate) {
                        // 实际上就是增加了onUpdate:[propName]的事件
                        schemaProps[`onUpdate:${propName}`] = function(value) {
                            // 更新state中的变量
                            setValueByPathInState(state, prop.varName, value)
                        }
                    }
                }
            }


            const eventProps = {}
            if (schema.events) {
                for (const event of schema.events) {
                    eventProps[event.eventName] = functionList[event.methodId]
                }
            }

            let props = {
                ...schemaProps,
                ...eventProps,
                'data-component-id': schema.id,
            }

            if (slotName) {
                props['data-component-in-slot'] = slotName
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
            // 附加 rm-node class
            if (result.props?.class) {
                result.props.class = result.props.class + ' rm-node'
            } else {
                if (result.props) {
                    result.props.class = 'rm-node'
                } else {
                    result.props = { class: 'rm-node' }
                }
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
            const props = {}
            if (children.length === 0) {
                props.style = {
                    width: '100%',
                    height: '100%',
                }
            }
            return h('div', props, children)
        }

        onMounted(() => {
            // innerCanvasReady event
            window.parent?.dispatchEvent(new CustomEvent('innerCanvasReady'))
        })




        return () => h(Container)
    }
})
