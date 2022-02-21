import { AnimationRendererRepresentation } from './AnimationRenderer'
import { ArrayRenderer } from './data/array/ArrayRenderer'
import { DataRenderer } from './data/DataRenderer'
import { DataType, PrototypicalDataState } from './data/DataState'
import { LiteralRenderer } from './data/literal/LiteralRenderer'
import { FunctionRenderer } from './data/reference/FunctionRenderer'
import { resolvePath } from './environment'
import { AccessorType, PrototypicalEnvironmentState } from './EnvironmentState'
import { IdentifierRenderer } from './identifier/IdentifierRenderer'

export function createDataRenderer(data: PrototypicalDataState) {
    const mapping = {
        [DataType.Literal]: LiteralRenderer,
        [DataType.Array]: ArrayRenderer,
        [DataType.Function]: FunctionRenderer,
    }

    if (!(data.type in mapping)) {
        console.error('No renderer for', data.type)
    }

    return new mapping[data.type]()
}

export class EnvironmentRenderer {
    element: HTMLDivElement

    dataRenderers: { [id: string]: DataRenderer } = {}
    identifierRenderers: { [id: string]: IdentifierRenderer } = {}

    private memoryCache: string = ''

    selection: Set<string> = new Set()

    constructor() {
        this.element = document.createElement('div')
        this.element.classList.add('environment')
    }

    setState(
        state: PrototypicalEnvironmentState,
        representation: AnimationRendererRepresentation = null
    ) {
        if (representation == null) {
            representation = {
                exclude: null,
                include: null,
            }
        }

        // Memory
        this.renderMemory(state, representation)

        const env = this

        // Render identifiers
        env.renderIdentifiers(state, representation)
        setTimeout(() => env.renderIdentifiers(state, representation))
    }

    tick(dt: number) {
        for (const id of Object.keys(this.identifierRenderers)) {
            this.identifierRenderers[id].tick(dt)
        }
    }

    select(selection: Set<string>) {
        // Highlight data that was modified
        this.selection = new Set([...this.selection, ...selection])

        const flattened = this.getAllChildRenderers()

        for (const [id, renderer] of Object.entries(flattened)) {
            if (this.selection.has(id)) {
                renderer.select(this.selection)
            } else {
                renderer.deselect()
            }
        }
    }

    deselect() {
        const flattened = this.getAllChildRenderers()

        for (const [id, renderer] of Object.entries(flattened)) {
            renderer.deselect()
        }
    }

    renderMemory(
        state: PrototypicalEnvironmentState,
        representation: AnimationRendererRepresentation
    ) {
        // Cached
        if (JSON.stringify(state) === this.memoryCache) {
            return
        }

        this.memoryCache = JSON.stringify(state)

        // Hit test
        const hits = new Set()

        let memory = Object.values(state.memory)
            .filter((m) => m != null)
            .filter(
                (data) =>
                    data.type == DataType.Literal ||
                    data.type == DataType.Array ||
                    data.type == DataType.Function
            )
            .filter((data) => {
                if (data.value != null) {
                    return !data.value.toString().includes('[native code]')
                } else {
                    return true
                }
            })

        // Filter
        if (representation.include != null) {
            memory = memory.filter((data) => representation.include.some((r) => includes(data, r)))
        } else if (representation.exclude != null) {
        }

        // Sort
        // memory.sort()

        // Render data
        // console.log(Object.values(state.memory))
        for (const data of memory) {
            // Create renderer if not there
            if (!(data.id in this.dataRenderers)) {
                const renderer = createDataRenderer(data)
                this.dataRenderers[data.id] = renderer
                this.element.append(renderer.element)
            }

            if (this.selection != null && data.id in this.selection) {
                this.dataRenderers[data.id].select(this.selection)
            }

            // this.element.append(this.dataRenderers[data.id].element)
            hits.add(data.id)
            this.dataRenderers[data.id].setState(data)
        }

        // Remove data that are no longer in the view
        for (const id of Object.keys(this.dataRenderers)) {
            if (!hits.has(id)) {
                const renderer = this.dataRenderers[id]
                renderer.destroy()
                renderer.element.remove()
                delete this.dataRenderers[id]
            }
        }
    }

    renderIdentifiers(
        state: PrototypicalEnvironmentState,
        representation: AnimationRendererRepresentation
    ) {
        // Hit test
        const hits = new Set()
        const dataHits = new Set()

        for (const scope of state.scope) {
            for (const name of Object.keys(scope.bindings)) {
                const location = scope.bindings[name].location
                const data = resolvePath(state, location, null)
                const dataRenderer = this.dataRenderers[data.id]

                if (dataRenderer == null) continue

                if (!(name in this.identifierRenderers)) {
                    const renderer = new IdentifierRenderer()
                    this.identifierRenderers[name] = renderer
                    this.element.appendChild(renderer.element)
                }

                // this.element.appendChild(this.identifierRenderers[name].element)

                hits.add(name)
                dataHits.add(data.id)

                this.identifierRenderers[name].setState(
                    scope.bindings[name],
                    dataRenderer,
                    this.element
                )
            }
        }

        // Remove hits that aren't used
        for (const name of Object.keys(this.identifierRenderers)) {
            if (!hits.has(name)) {
                const renderer = this.identifierRenderers[name]
                renderer.destroy()
                renderer.element.remove()
                delete this.identifierRenderers[name]
            }
        }

        // Add out label to the RHS of the data
        for (const id of Object.keys(this.dataRenderers)) {
            if (!dataHits.has(id)) {
                const dataRenderer = this.dataRenderers[id]
                if (dataRenderer == null) continue

                const name = 'out'

                if (!(name in this.identifierRenderers)) {
                    const renderer = new IdentifierRenderer()
                    this.identifierRenderers[name] = renderer
                    this.element.appendChild(renderer.element)
                }

                hits.add(name)

                this.identifierRenderers[name].setState(
                    { name, location: [{ type: AccessorType.ID, value: id }] },
                    dataRenderer,
                    this.element
                )

                this.identifierRenderers[name].element.classList.add('out')

                break
            }
        }
    }

    destroy() {
        for (const id of Object.keys(this.dataRenderers)) {
            const renderer = this.dataRenderers[id]
            renderer.destroy()
        }

        for (const name of Object.keys(this.identifierRenderers)) {
            const renderer = this.identifierRenderers[name]
            renderer.destroy()
        }

        this.element.remove()
    }

    getAllChildRenderers() {
        let renderers: { [id: string]: DataRenderer | IdentifierRenderer } = {}

        for (const [id, renderer] of Object.entries(this.dataRenderers)) {
            renderers[id] = renderer

            renderers = {
                ...renderers,
                ...renderer.getAllChildRenderers(),
            }
        }

        for (const [id, renderer] of Object.entries(this.identifierRenderers)) {
            renderers[id] = renderer
        }

        return renderers
    }
}

/**
 * @returns true iff query is included in data or is data itself
 */
function includes(data: PrototypicalDataState, query: string) {
    if (data.type != DataType.Array) {
        return data.id == query
    } else {
        return (
            data.id == query ||
            (data.value as PrototypicalDataState[]).some((d) => includes(d, query))
        )
    }
}
