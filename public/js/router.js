import Container from "./container.js";
import {useProjectStore} from './store.js'
import {fetchPageSchema} from "./util.js";
const {createWebHashHistory, createRouter} = VueRouter

const routes = [
    {
        path: '/',
        component: Container
    },
    {
        path: '/404',
        component: () => import('./404.js')
    },
    {
        path: '/:pageRoute',
        component: Container
    }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

router.beforeEach(async (to, from, next) => {
    if(to.path === '/404') {
        next()
        return
    }

    const projectStore = useProjectStore()
    const pages = projectStore.pages

    // 找到对应的page
    const page = pages.find(page => to.path === '/' ? (page.id === projectStore.project.homePageId) : (page.route === '/' + to.params.pageRoute))
    if(page) {
        if(!page.schema) {
            await fetchPageSchema(page.id)
        }
        projectStore.currentPageSchema = page.schema
        next()
        return
    }
    next("/404")
})

export default router