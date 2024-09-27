const keyPrefix = "__yo_store__"


const piniaStorePlugin = () => {
    return ({store}) => {
        const persistVariables = store.$state.persistVariables || [];
        const storeId = store.$id

        const generateKey = (name) => {
            return `${keyPrefix}@${storeId}__${name}`
        }
        const updateStorage = (name, storageObj, store) => {
            storageObj.setItem(generateKey(name), JSON.stringify(store.$state[name]))
        }

        // 恢复状态
        const restoreState = () => {
            persistVariables.forEach(item => {
                const { name, storage } = item;
                const storageObj = storage === 'sessionStorage' ? sessionStorage : localStorage;
                const value = storageObj.getItem(name);
                if (value) {
                    store.$state[generateKey(name)] = JSON.parse(value)
                }
            })
        }

        restoreState()

        store.$subscribe((mutation) => {
            persistVariables.forEach(item => {
                const { name, storage } = item;
                // if(mutation.events.target.some(t => t.name === name)) {
                    const storageObj = storage === 'sessionStorage' ? sessionStorage : localStorage;
                    updateStorage(name, storageObj, store)
                // }
            })
        })

        store.addPersistVariable = (name, storage) => {
            if(persistVariables.some(item => item.name === name)) {
                // 覆盖
                persistVariables.forEach(item => {
                    if(item.name === name) {
                        item.storage = storage
                    }
                })
            } else {
                persistVariables.push({
                    name,
                    storage
                })
                updateStorage(name, storage === 'sessionStorage' ? sessionStorage : localStorage, store)
            }
        }
    }
}

export default piniaStorePlugin