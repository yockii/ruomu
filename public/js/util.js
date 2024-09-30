import {useProjectStore, useCommonStore} from './store.js'

const beforeEachFuncList = []

const initRouterGuard = (project) => {
    const commonStore = useCommonStore()
    const fl = []
    if (project.routeGuard) {
        if (project.routeGuard.beforeEnter) {
            const code = project.routeGuard.beforeEnter
            const fn = (to, from, next) => {
                const f = (store, to, from, next) => {
                    const script = `(function(){${code}})();`
                    eval(script)
                }
                f(commonStore.$state, to, from, next)
            }
            fl.push(fn)
        }
    }
    // 清空，重新赋值
    beforeEachFuncList.length = 0
    beforeEachFuncList.push(...fl)
}

const fetchProjectInfo = async () => {
    try {
        const projectStore = useProjectStore()

        const resp = await axios.get("./project/instance", {params: {id: projectId}})
        projectStore.project = resp.data.data

        // await fetchProjectPages()
        //
        // if(projectStore.project.homePageId) {
        //     fetchPageSchema(projectStore.project.homePageId)
        // } else {
        //     fetchPageSchema(projectStore.pages[0].id)
        // }
    } catch (e) {
        console.error(e)
    }
}

const fetchProjectPages = async () => {
    try {
        const projectStore = useProjectStore()

        const resp = await axios.get("./page/list", {params: {projectId, offset: -1, limit: -1}})
        projectStore.pages = resp.data.data.items

    } catch (e) {
        console.error(e)
    }
}

const fetchPageSchema = async (pageId) => {
    try {
        const projectStore = useProjectStore()

        const resp = await axios.get("./page/schema", {params: {id: pageId}})
        const schema = resp.data.data
        projectStore.currentPageSchema = schema
        projectStore.pages.find(page => page.id === pageId).schema = schema
    } catch (e) {
        console.error(e)
    }
}


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

const getValueByPathFromState = (state, store, path) => {
    // path = 'state.xxx.xxx'
    const pathArr = path.split('.')
    // 要去掉 state.
    const where = pathArr.shift()
    const obj = where === 'state' ? state : store.$state
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


export {
    fetchProjectInfo,
    fetchProjectPages,
    fetchPageSchema,
    parseStyles,
    getValueByPathFromState,
    setValueByPathInState,
    beforeEachFuncList,
    initRouterGuard
}