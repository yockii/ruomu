import {useCommonStore, useProjectStore} from './store.js'
import {parseStyles, getValueByPathFromState, setValueByPathInState} from './util.js'
import router from "./router.js";

const { defineComponent, h, onMounted, getCurrentInstance, reactive, onUnmounted, onUpdated, onBeforeMount, onBeforeUnmount } = Vue
const { storeToRefs } = Pinia
const { useRoute } = VueRouter

export default defineComponent({
    name: 'Container',
    setup() {
        const projectStore = useProjectStore()
        const { project, currentPageSchema } = storeToRefs(projectStore)

        const commonStore = useCommonStore()

        const { appContext } = getCurrentInstance()
        const globalComponents = appContext.components;

        // 处理项目级别store
        if(project.value.store) {
            project.value.store.forEach(item => {
                commonStore.registerVariable(item)
            })
        }
        // 处理项目的api
        if(project.value.api) {

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
                            props[name] = item.defaultValue === 'true';
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

        const apiList = {}
        const functionList = {}
        const fxList = {}
        if (project.value.api && project.value.api.apiList) {
            const apiInfo = project.value.api
            // preAction/postAction 需要注入到axios拦截器中
            axios.interceptors.request.use(config => {
                if (apiInfo.preAction) {
                    // preAction是字符串
                    // return new Function('config', apiInfo.preAction)(config)
                    const fn = (state, store, api, route, fx, config) => {
                        const script = `(function(){${apiInfo.preAction}})();`
                        eval(script)
                    }
                    fn(state, commonStore.$state, apiList, useRoute(), fxList, config)

                    return config
                }
                return config
            })
            axios.interceptors.response.use(response => {
                if (apiInfo.postAction) {
                    // postAction是字符串
                    // return new Function('response', apiInfo.postAction)(response)
                    return new Function("state", "store", "api", "route", "fx", 'response', apiInfo.postAction)(state, commonStore.$state, apiList, useRoute(), fxList, response)
                }
                return response
            })

            for (const item of apiInfo.apiList) {
                apiList[item.name] = (config) => {
                    config.url = item.url
                    config.method = item.method
                    return axios.request(config)
                }
            }
        }


        if (currentPageSchema.value.js && currentPageSchema.value.js.methods) {
            for (const item of currentPageSchema.value.js.methods) {
                const executor = (...args) => {
                    const fn = (state, store, api, router, fx, ...params) => {
                        // eval(item.code)
                        const script = `(function() {${item.code}})();`
                        eval(script)
                    }
                    fn(state, commonStore.$state, apiList, router, fxList, ...args)
                }


                functionList[item.id] = executor
                fxList[item.name] = executor
            }
        }


        const render = (n, p, c) => {
            const component = globalComponents[n]
            if(component) {
                return h(component, p, c)
            } else {
                return h(n,p,c)
            }
        }

        const renderSchema = (schema, slotName) => {
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
                                slotChildren.push(renderSchema(node, slot.name))
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
                        defaultSlotChildren.push(renderSchema(node))
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

                    let v
                    let varName = prop.varName

                    // 判断是否有 {{符号
                    if (varName.indexOf('{{') > -1) {
                        // 使用了模板变量，如：{{pageId}}，则需要提取出每个{{}}包裹的变量
                        v = varName.replace(/\{\{(.*?)}}/g, (match, p1) => {
                            // p1是匹配到的变量名，如pageId
                            // 获取变量的值
                            v = getValueByPathFromState(state, commonStore, p1)
                            return v
                        })
                    } else {
                        v = getValueByPathFromState(state, commonStore, varName)
                    }
                    schemaProps[propName] = v

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
            const schema = projectStore.currentPageSchema
            if (schema && schema.children) {
                for (const node of schema.children) {
                    children.push(renderSchema(node))
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
            const route = useRoute()
            const pageRoute = route.params.pageRoute


            if(currentPageSchema.value.js && currentPageSchema.value.js.onMounted) {
                const code = currentPageSchema.value.js.onMounted
                // onMounted 是字符串代码,如果有则执行
                const fn = (state, store, api, route, fx) => {
                    const script = `(function() {${code}})();`
                    eval(script)
                }
                fn(state, commonStore.$state, apiList, route, fxList)
            }
        })

        // 其他生命周期代码如果有，则准备执行
        if(currentPageSchema.value.js) {
            // onUnmounted, onUpdated, onBeforeMount, onBeforeUnmount
            if(currentPageSchema.value.js.onUnmounted) {
                onUnmounted(() => {
                    const code = currentPageSchema.value.js.onUnmounted
                    const fn = (state, store, api, route, fx) => {
                        const script = `(function() {${code}})();`
                        eval(script)
                    }
                    fn(state, commonStore.$state, apiList, useRoute(), fxList)
                })
            }
            if(currentPageSchema.value.js.onUpdated) {
                onUpdated(() => {
                    const code = currentPageSchema.value.js.onUpdated
                    const fn = (state, store, api, route, fx) => {
                        const script = `(function() {${code}})();`
                        eval(script)
                    }
                    fn(state, commonStore.$state, apiList, route, fxList)
                })
            }
            if(currentPageSchema.value.js.onBeforeMount) {
                onBeforeMount(() => {
                    const code = currentPageSchema.value.js.onBeforeMount
                    const fn = (state, store, api, route, fx) => {
                        const script = `(function() {${code}})();`
                        eval(script)
                    }
                    fn(state, commonStore.$state, apiList, useRoute(), fxList)
                })
            }
            if(currentPageSchema.value.js.onBeforeUnmount) {
                onBeforeUnmount(() => {
                    const code = currentPageSchema.value.js.onBeforeUnmount
                    const fn = (state, store, api, route, fx) => {
                        const script = `(function() {${code}})();`
                        eval(script)
                    }
                    fn(state, commonStore.$state, apiList, useRoute(), fxList)
                })
            }
        }


        return () => h(Container, {state, projectStore})
    }
})
