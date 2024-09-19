const {defineStore} = Pinia;

function findSchemaSegment(id, schema) {
    if (!schema || schema.id === id) {
        return schema
    }
    if (schema.children) {
        for (const child of schema.children) {
            const result = findSchemaSegment(id, child)
            if (result) {
                return result
            }
        }
    }
    return null
}

function findAndRemoveSchemaSegment(id, schema) {
    if (typeof schema === 'string') {
        return
    }
    if (schema && schema.children) {
        for (let i = 0; i < schema.children.length; i++) {
            const child = schema.children[i]
            if (child.id === id) {
                schema.children.splice(i, 1)
                return
            }
            findAndRemoveSchemaSegment(id, child)
        }
    }
}

function findSchemaSegmentParent(id, schema) {
    if (schema.children) {
        for (const child of schema.children) {
            if (child.id === id) {
                return schema
            }
            const result = findSchemaSegmentParent(id, child)
            if (result) {
                return result
            }
        }
    }
    return null
}

export const useProjectStore = defineStore("project", {
    state: () => ({
        project: {
            id: "demo",
            name: "DEMO",
            description: "A demo project",
            homePageId: "",
            status: 1,
            usedMaterialLib: [],
        },
        pages: [],
        currentPageSchema: {
            id: '1',
            state: {},
            fileName: 'index.vue',
            componentId: 'page',
            componentName: 'page',
            tagName: '',
            props: {},
            css: '',
            children: [
                {
                    id: '2222',
                    componentId: 'builtInComponentDiv',
                    componentName: 'div',
                    tagName: 'div',
                    props: {
                        innerHTML: 'Hello World'
                    },
                }
            ],
            js: {
                methods: []
            }
        }
    }),
    getters: {
        styleValue: (state) => (schemaId, styleName) => {
            const schema = findSchemaSegment(schemaId, state.currentPageSchema)
            if (schema && schema.props && schema.props.style) {
                return schema.props.style[styleName]
            }
            return ''
        }
    },
    actions: {
        findSchemaSegment(id) {
            if (this.currentPageSchema && id) {
                // 从children中查找(递归)
                if (this.currentPageSchema.children) {
                    for (const child of this.currentPageSchema.children) {
                        if (child.id === id) {
                            return child
                        }
                        const result = findSchemaSegment(id, child)
                        if (result) {
                            return result
                        }
                    }
                }
            }
            return null
        },
        moveSchema(schema, targetSchemaId, position) {
            if (!schema || !targetSchemaId || !position || !this.currentPageSchema) {
                return
            }
            // 先找到原来的schema并移除
            findAndRemoveSchemaSegment(schema.id, this.currentPageSchema)
            if (position === 'in') {
                if (targetSchemaId === 'BODY') {
                    if (this.currentPageSchema.children) {
                        this.currentPageSchema.children.push(schema)
                    } else {
                        this.currentPageSchema.children = [schema]
                    }
                } else {
                    const targetSchema = findSchemaSegment(targetSchemaId, this.currentPageSchema)
                    if (targetSchema) {
                        if (targetSchema.children) {
                            targetSchema.children.push(schema)
                        } else {
                            targetSchema.children = [schema]
                        }
                    }
                }
            } else {
                // 找到目标schema的父级
                const parent = findSchemaSegmentParent(targetSchemaId, this.currentPageSchema)
                if (parent) {
                    const index = parent.children ? parent.children.findIndex(child => child.id === targetSchemaId) : -1
                    if (index !== -1) {
                        if (parent.children) {
                            if (position === 'top' || position === 'left' || position === 'before') {
                                parent.children.splice(index, 0, schema)
                            } else {
                                parent.children.splice(index + 1, 0, schema)
                            }
                        } else {
                            parent.children = [schema]
                        }
                    }
                }
            }
        },
        addComponent(data, targetSchemaId, position) {
            // 生成一个新的schema
            const schema = {
                id: `${Date.now()}`,
                componentId: data.id,
                componentName: data.name,
                tagName: data.tagName,
                props: {},
                children: [],
                isContainer: data.metaInfo.isContainer,
            }

            // 如果没有style或者style.padding,则添加默认值
            const defaultStyle = {
                paddingTop: '4px',
                paddingBottom: '4px',
                paddingLeft: '8px',
                paddingRight: '8px',
            }
            if (!schema.props.style) {
                schema.props.style = defaultStyle
            }

            this.moveSchema(schema, targetSchemaId, position)
        },
        addNewCustomMethod(m) {
            if (this.currentPageSchema?.js) {
                if (this.currentPageSchema.js.methods) {
                    this.currentPageSchema.js.methods.push(m)
                } else {
                    this.currentPageSchema.js.methods = [m]
                }
            } else if (this.currentPageSchema) {
                this.currentPageSchema.js = {
                    methods: [m]
                }
            }
        },
        removeCustomMethod(methodId) {
            if (this.currentPageSchema?.js?.methods) {
                this.currentPageSchema.js.methods = this.currentPageSchema.js.methods.filter(m => m.id !== methodId)
            }
        },
        parentSchema(schemaId) {
            if (this.currentPageSchema) {
                return findSchemaSegmentParent(schemaId, this.currentPageSchema)
            }
            return null
        },
        removeSchema(schemaId) {
            if (this.currentPageSchema) {
                findAndRemoveSchemaSegment(schemaId, this.currentPageSchema)
            }
        },
        updateSchemaPropValue(schemaId, propName, value) {
            const schema = this.findSchemaSegment(schemaId)
            if (schema) {
                if (value) {
                    schema.props[propName] = value
                } else {
                    // 删除属性
                    delete schema.props[propName]
                }
            }
        },
        updateSchemaStyleValue(schemaId, value) {
            const schema = this.findSchemaSegment(schemaId)
            if (schema) {
                schema.style = value
            }
        },
        addSchemaPropStyleValue(schemaId, styleName, value) {
            const schema = this.findSchemaSegment(schemaId)
            if (schema) {
                if (schema.props) {
                    if (schema.props.style) {
                        if (value) {
                            schema.props.style[styleName] = value
                        } else {
                            // 删除属性
                            delete schema.props.style[styleName]
                        }
                    } else {
                        if (value) {
                            schema.props.style = {
                                [styleName]: value,
                            }
                        }
                    }
                } else {
                    if (value) {
                        schema.props = {
                            style: {
                                [styleName]: value,
                            },
                        }
                    }
                }
            }
        }
    },
})

export const useNonePersistStore = defineStore("common", {})

export const useSessionStore = defineStore("session", {
})