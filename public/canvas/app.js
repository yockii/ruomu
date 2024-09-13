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

            let props = {
                ...schema.props,
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
