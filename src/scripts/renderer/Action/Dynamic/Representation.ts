import * as monaco from 'monaco-editor'
import { ApplicationState } from '../../../ApplicationState'
import { EnvironmentState, FrameInfo } from '../../../environment/EnvironmentState'
import { getExecutionSteps, isPrimitiveByDefault, isTrimmedByDefault } from '../../../utilities/action'
import { reflow } from '../../../utilities/dom'
import { assert } from '../../../utilities/generic'
import { Keyboard } from '../../../utilities/Keyboard'
import { getLastPointInPath, getNumericalValueOfStyle, overLerp } from '../../../utilities/math'
import { clearExistingFocus, isFocused } from '../../../visualization/Focus'
import {
    collapseActionIntoAbyss,
    destroyAbyss,
    getAbyssControlFlowPoints,
    getConsumedAbyss,
    getSpatialAbyssControlFlowPoints,
} from '../Abyss'
import { ActionState, createActionState, destroyAction, getActionCoordinates, updateAction } from '../Action'
import { isSpatialByDefault } from '../Mapping/ActionProxy'
import { getTotalDuration } from '../Mapping/ControlFlowCursor'
import { ControlFlowState } from '../Mapping/ControlFlowState'
import { FunctionCallRepresentation } from './FunctionCallRepresentation'

/* ------------------------------------------------------ */
/*              Abstract representation class             */
/* ------------------------------------------------------ */
export class Representation {
    actionId: string
    shouldHover: boolean = false
    ignoreStepClicks: boolean = false

    isPrimitive: boolean = false
    isTrimmed: boolean = false

    hasStartAnimation: boolean = false
    hasEndAnimation: boolean = false

    isSelectableGroup = false

    /**
     * Only class since typescript doesn't have type classes :(
     * @param action
     */
    constructor(action: ActionState) {
        this.actionId = action.id

        this.isTrimmed = isTrimmedByDefault(action.execution)
        this.isPrimitive = isPrimitiveByDefault(action.execution)
    }

    // TODO: If statements inside of for loops are bugged
    updateActionVisual() {
        const action = ApplicationState.actions[this.actionId]

        // Update position
        const bbox = getActionCoordinates(
            action.execution,
            action.parentID ? ApplicationState.actions[action.parentID].execution : undefined
        )

        action.element.style.left = `${bbox.x}px`
        action.element.style.top = `${bbox.y}px`
        action.element.style.width = `${bbox.width}px`
        action.element.style.height = `${bbox.height}px`

        // Update classes
        action.isShowingSteps
            ? action.element.classList.add('is-showing-steps')
            : action.element.classList.remove('is-showing-steps')
    }

    postCreate() {}

    updateProxyVisual() {
        const action = ApplicationState.actions[this.actionId]
        const proxy = action.proxy

        const bbox = getActionCoordinates(
            action.execution,
            action.parentID ? ApplicationState.actions[action.parentID].execution : undefined
        )

        // Scale by the proxy scale
        let height = bbox.height * ApplicationState.proxyHeightMultiplier
        let width = bbox.width * ApplicationState.proxyWidthMultiplier
        width = Math.max(10, width)
        height = Math.max(10, height)

        if (action.isShowingSteps) {
            proxy.element.style.height = `fit-content`
            proxy.element.style.width = `fit-content`
        } else {
            proxy.element.style.height = `${height}px`
            proxy.element.style.width = `${width}px`
        }

        if (action.isSpatial && action.placeholder != null && action.execution.nodeData.type != 'Program') {
            action.placeholder.style.height = `${height}px`
            action.placeholder.style.width = `${width}px`
        }

        // Update classes
        action.isShowingSteps
            ? proxy.element.classList.add('is-showing-steps')
            : proxy.element.classList.remove('is-showing-steps')

        action.isShowingSteps
            ? proxy.container.classList.add('is-showing-steps')
            : proxy.container.classList.remove('is-showing-steps')

        action.isSpatial ? proxy.container.classList.add('is-spatial') : proxy.container.classList.remove('is-spatial')
        this.isTrimmed ? proxy.element.classList.add('is-trimmed') : proxy.element.classList.remove('is-trimmed')
        this.isPrimitive ? proxy.element.classList.add('is-primitive') : proxy.element.classList.remove('is-primitive')

        // Add line break if necessary
        if (action.execution.nodeData.hasLineBreak) {
            proxy.container.classList.add('has-line-break')
        } else {
            proxy.container.classList.remove('has-line-break')
        }

        /* ------------- If statement representation ------------ */
        if (action.execution.nodeData.preLabel == 'Test') {
            if (!action.isShowingSteps) {
                const memory = Object.values((action.execution.postcondition as EnvironmentState).memory)
                const value = memory[memory.length - 1].value
                proxy.element.classList.add(`_Test_${value}`)
                const icon = value ? 'checkmark-outline' : 'close-outline'
                proxy.element.innerHTML = `<ion-icon name="${icon}"></ion-icon>`
            } else {
                // TODO
            }
        }

        /* -------------- Primitive representation -------------- */
        if (action.representation.isPrimitive) {
            const parent = action

            if (parent.execution.nodeData.location == undefined) {
                throw new Error('Action has no location')
            }

            const label = ApplicationState.editor.getValueAt(parent.execution.nodeData.location)

            if (label == undefined) {
                throw new Error('Action has no label')
            }

            proxy.element.innerHTML = `${label.trim()}`
            monaco.editor.colorize(proxy.element.innerHTML, 'javascript', {}).then((html) => {
                proxy.element.innerHTML = html
                proxy.element.classList.add('fit-width')
                reflow(proxy.element)
                proxy.element.style.width = `${proxy.element.getBoundingClientRect().width}px`
                proxy.element.classList.remove('fit-width')
            })
        }
    }

    updateSpatialActionProxyPosition(offset: { x: number; y: number }): string[] {
        const action = ApplicationState.actions[this.actionId]

        const spatialIDs = []

        // Update self
        if (action.isSpatial) {
            if (action.execution.nodeData.type == 'Program') {
                action.proxy.container.style.left = `${offset.x}px`
                action.proxy.container.style.top = `${offset.y}px`
            } else {
                assert(action.parentID != null, 'Non-program action has no parent.')
                const parent = ApplicationState.actions[action.parentID]

                assert(parent.spatialParentID != null, 'Non-program action has no spatial parent.')
                const spatialParent = ApplicationState.actions[parent.spatialParentID]
                let spatialParentBbox = spatialParent.proxy.container.getBoundingClientRect()

                const spatialParentAbyssInfo = getConsumedAbyss(spatialParent.id)
                // if (spatialParentAbyssInfo != null) {
                //     const abyss = ApplicationState.abysses[spatialParentAbyssInfo.id]
                //     spatialParentBbox = abyss.dotsContainer.getBoundingClientRect()
                // }

                const vizBbox = (action.proxy.container.parentElement as HTMLElement).getBoundingClientRect()

                // const bbox = getPrincipleBbox(action)

                const x = spatialParentBbox.x + spatialParentBbox.width + offset.x - vizBbox.x
                const y = spatialParentBbox.y + offset.y

                const px = getNumericalValueOfStyle(action.proxy.container.style.left, x)
                const py = getNumericalValueOfStyle(action.proxy.container.style.top, y)

                action.proxy.container.style.left = `${overLerp(px, x, 0.2, 0.5)}px`
                action.proxy.container.style.top = `${overLerp(py, y, 0.2, 0.5)}px`
            }

            spatialIDs.push(action.id)

            // Consume offset if spatial
            offset.x = 0
            offset.y = 0
        }

        // Update children
        if (action.isShowingSteps) {
            spatialIDs.push(...this.updateSpatialActionProxyPositionChildren(offset))
        }

        return spatialIDs
    }

    updateSpatialActionProxyPositionChildren(offset: { x: number; y: number }): string[] {
        const action = ApplicationState.actions[this.actionId]
        const spatialIDs: string[] = []

        action.vertices.forEach((id) => {
            const vertex = ApplicationState.actions[id]
            spatialIDs.push(...vertex.representation.updateSpatialActionProxyPosition(offset))
        })

        return spatialIDs
    }

    // Get frames should call get frames of each step.
    getFrames(originId: string): FrameInfo[] {
        const action = ApplicationState.actions[this.actionId]

        if (action.vertices.length > 0 && (!action.isSpatial || action.id == originId)) {
            const frames: FrameInfo[] = []

            if (this.isSelectableGroup) {
                const frame = {
                    environment: action.execution.precondition as EnvironmentState,
                    actionId: action.id,
                }
                frames.push(frame)
            }

            for (const stepID of action.vertices) {
                const step = ApplicationState.actions[stepID]
                frames.push(...step.representation.getFrames(originId))
            }

            if (this.isSelectableGroup) {
                const frame = {
                    environment: action.execution.postcondition as EnvironmentState,
                    actionId: action.id,
                }
                frames.push(frame)
            }

            return frames
        } else {
            if (this.isTrimmed) {
                return []
            }

            if (action.execution.nodeData.preLabel == 'Value') {
                const parent = ApplicationState.actions[action.parentID!]
                if (parent.execution.nodeData.type == 'VariableDeclaration') {
                    return [{ environment: parent.execution.postcondition as EnvironmentState, actionId: action.id }]
                }
            }

            return [{ environment: action.execution.postcondition as EnvironmentState, actionId: action.id }]
        }
    }

    getControlFlowPoints(usePlaceholder: boolean = true): [[number, number], [number, number]] | null {
        if (this.isTrimmed) {
            return null
        }

        const action = ApplicationState.actions[this.actionId]
        let bbox = action.proxy.element.getBoundingClientRect()
        const abyssInfo = getConsumedAbyss(action.id)

        if (abyssInfo != null && !action.isSpatial) {
            // Find the abyss that it's in
            const abyss = ApplicationState.abysses[abyssInfo.id]
            return getAbyssControlFlowPoints(abyss, abyssInfo.index!)
        }

        if (action.isSpatial && action.placeholder != null && usePlaceholder) {
            bbox = action.placeholder.getBoundingClientRect()
        } else if (action.isSpatial && abyssInfo != null) {
            const abyss = ApplicationState.abysses[abyssInfo.id]
            return getSpatialAbyssControlFlowPoints(abyss, action.id)
        }

        if (bbox.height == 0 || bbox.width == 0) {
            console.warn('Action has no size', action.execution.nodeData.type)
            return null
        }

        const offset = Math.min(2, bbox.height * 0.1)

        return [
            [bbox.x + bbox.width / 2, bbox.y + offset],
            [bbox.x + bbox.width / 2, bbox.y + bbox.height - offset],
        ]
    }

    getControlFlowCache(originId: string): string {
        const action = ApplicationState.actions[this.actionId]
        let cache = ''

        if (action.vertices.length > 0 && (!action.isSpatial || action.id == originId)) {
            if (action.representation.isSelectableGroup) {
                let points = this.getControlFlowPoints(false) as [number[], number[]]
                cache += JSON.stringify(points)
            }

            for (const stepID of action.vertices) {
                const step = ApplicationState.actions[stepID]
                cache += step.representation.getControlFlowCache(originId)
            }
        } else {
            const points = this.getControlFlowPoints()

            if (points != null) {
                cache += JSON.stringify(points)
            }
        }

        return cache
    }

    updateControlFlow(controlFlow: ControlFlowState, originId: string, isSpatiallyConsumed: boolean = false) {
        const action = ApplicationState.actions[this.actionId]

        if (action.vertices.length > 0 && !action.isSpatial && isSpatiallyConsumed) {
            // Start
            let d = controlFlow.flowPath.getAttribute('d') as string
            let [x, y] = getLastPointInPath(d)
            x += ApplicationState.Epsilon
            d += ` L ${x} ${y}`
            controlFlow.flowPath.setAttribute('d', d)
            action.startTime = controlFlow.flowPath.getTotalLength()

            // Steps
            for (let s = 0; s < action.vertices.length; s++) {
                const stepID = action.vertices[s]
                const step = ApplicationState.actions[stepID]

                // Add start point to path
                step.representation.updateControlFlow(controlFlow, originId, true)
            }

            // End
            d = controlFlow.flowPath.getAttribute('d') as string
            let [x2, y2] = getLastPointInPath(d)
            x2 += ApplicationState.Epsilon
            d += ` L ${x2} ${y2}`
            controlFlow.flowPath.setAttribute('d', d)
            action.endTime = controlFlow.flowPath.getTotalLength()

            return
        } else if (isSpatiallyConsumed) {
            let d = controlFlow.flowPath.getAttribute('d') as string
            let [x, y] = getLastPointInPath(d)

            // Start
            x += ApplicationState.Epsilon
            d += ` L ${x} ${y}`
            controlFlow.flowPath.setAttribute('d', d)
            action.startTime = controlFlow.flowPath.getTotalLength()

            let delta = ApplicationState.Epsilon

            if (action.isSpatial) {
                const origin = ApplicationState.actions[originId]
                const representation = origin.representation as FunctionCallRepresentation
                delta = representation.sizePerSpatialStep
            }

            // End
            x += delta
            d += ` L ${x} ${y}`
            controlFlow.flowPath.setAttribute('d', d)
            action.endTime = controlFlow.flowPath.getTotalLength()
            return
        }

        if (action.vertices.length > 0 && (!action.isSpatial || action.id == originId)) {
            let starts: number[] = []
            let ends: number[] = []

            // Start for selectable groups
            if (action.representation.isSelectableGroup) {
                let [start, _] = this.getControlFlowPoints(false) as [number[], number[]]
                const containerBbox = (controlFlow.flowPath.parentElement as HTMLElement).getBoundingClientRect()

                start[0] -= containerBbox.x
                start[1] -= containerBbox.y

                let d = controlFlow.flowPath.getAttribute('d') as string

                if (controlFlow.flowPath.getAttribute('d') == '') {
                    d += `M ${start[0]} ${start[1]}`
                } else {
                    d += ` L ${start[0]} ${start[1]}`
                }

                controlFlow.flowPath.setAttribute('d', d)
                action.startTime = controlFlow.flowPath.getTotalLength()
                starts.push(action.startTime)
            }

            for (let s = 0; s < action.vertices.length; s++) {
                const stepID = action.vertices[s]
                const step = ApplicationState.actions[stepID]

                // Add start point to path
                step.representation.updateControlFlow(controlFlow, originId)

                starts.push(step.startTime)
                ends.push(step.endTime)
            }

            // End for selectable groups
            if (action.representation.isSelectableGroup) {
                let [_, end] = this.getControlFlowPoints(false) as [number[], number[]]
                const containerBbox = (controlFlow.flowPath.parentElement as HTMLElement).getBoundingClientRect()
                end[0] -= containerBbox.x
                end[1] -= containerBbox.y

                let d = controlFlow.flowPath.getAttribute('d') as string
                d += ` L ${end[0]} ${end[1]}`

                controlFlow.flowPath.setAttribute('d', d)
                action.endTime = controlFlow.flowPath.getTotalLength()
                ends.push(action.endTime)
            }

            starts = starts.filter((s) => s != null)
            ends = ends.filter((s) => s != null)

            if (starts.length > 0 && ends.length > 0) {
                action.startTime = starts[0]
                action.endTime = ends[ends.length - 1]
            }
        } else {
            const points = this.getControlFlowPoints()

            if (points != null) {
                const [start, end] = points

                const containerBbox = (controlFlow.flowPath.parentElement as HTMLElement).getBoundingClientRect()

                start[0] -= containerBbox.x
                start[1] -= containerBbox.y
                end[0] -= containerBbox.x
                end[1] -= containerBbox.y

                let d = controlFlow.flowPath.getAttribute('d') as string

                if (controlFlow.flowPath.getAttribute('d') == '') {
                    d += `M ${start[0]} ${start[1]}`
                } else {
                    d += ` L ${start[0]} ${start[1]}`
                }

                controlFlow.flowPath.setAttribute('d', d)
                action.startTime = controlFlow.flowPath.getTotalLength()

                // if (action.isSpatial && action.id != originId) {
                //     action.globalTimeOffset = action.startTime
                // }

                d += ` L ${end[0]} ${end[1]}`
                controlFlow.flowPath.setAttribute('d', d)
                action.endTime = controlFlow.flowPath.getTotalLength()
            }
        }
    }

    // getControlFlow(): number[][] {
    //     if (this.isTrimmed) {
    //         return []
    //     }

    //     const action = ApplicationState.actions[this.actionId]

    //     if (action.vertices.length > 0) {
    //         const controlFlowPoints = []
    //         for (const stepID of action.vertices) {
    //             const step = ApplicationState.actions[stepID]

    //             if (!step.isSpatial) {
    //                 controlFlowPoints.push(...step.representation.getControlFlow())
    //             } else {
    //                 controlFlowPoints.push(...step.representation.getControlFlowPoints())
    //             }
    //         }
    //         return controlFlowPoints
    //     } else {
    //         return this.getControlFlowPoints()
    //     }
    // }

    /**
     * Breaks down the action into sub-steps in-line.
     * @param action
     */
    createSteps() {
        const action = ApplicationState.actions[this.actionId]

        const t = performance.now()

        if (action.isShowingSteps) {
            console.warn('Steps already created! Destroying existing.')
            action.vertices.forEach((id) => destroyAction(ApplicationState.actions[id]))
        }

        action.vertices = []
        action.edges = []

        let steps = getExecutionSteps(action.execution)

        // Create direct descendants
        for (let i = 0; i < steps.length; i++) {
            // Create step state
            const step = createActionState({
                execution: steps[i],
                parentID: action.id,
                isSpatial: isSpatialByDefault(steps[i]),
                spatialParentID: action.spatialParentID,
            })
            action.vertices.push(step.id)
            action.edges.push({
                label: steps[i].nodeData.preLabel ?? 'Unknown',
            })

            // Append step to action
            action.element.appendChild(step.element)
        }

        // console.log(`[${action.id}] Created ${steps.length} steps for  in ${performance.now() - t}ms`)

        // Update state
        action.isShowingSteps = true
        updateAction(action)

        for (const stepId of action.vertices) {
            const step = ApplicationState.actions[stepId]
            step.representation.postCreate()
        }

        // console.log(`[${action.id}] Updated action in ${performance.now() - t}ms`)
    }

    minimize() {
        const action = ApplicationState.actions[this.actionId]

        if (action.isShowingSteps) {
            action.vertices.forEach((id) => {
                const step = ApplicationState.actions[id]

                if (!step.isSpatial) {
                    step.representation.minimize()
                }
            })
        }

        action.proxy.container.classList.add('is-minimized')
        action.minimized = true

        if (action.isSpatial) {
            const minimizeButton = action.proxy.header.children[1].children[0] as HTMLElement
            minimizeButton.innerText = '+'
        }
    }

    maximize() {
        const action = ApplicationState.actions[this.actionId]

        if (action.isShowingSteps) {
            action.vertices.forEach((id) => {
                const step = ApplicationState.actions[id]

                if (!step.isSpatial) {
                    step.representation.maximize()
                }
            })
        }

        action.proxy.container.classList.remove('is-minimized')
        action.minimized = false

        if (action.isSpatial) {
            const minimizeButton = action.proxy.header.children[1].children[0] as HTMLElement
            minimizeButton.innerText = '-'
        }
    }

    clip() {}

    unClip() {}

    select() {
        const action = ApplicationState.actions[this.actionId]
        action.proxy.element.classList.add('is-focused')
    }

    deselect() {
        const action = ApplicationState.actions[this.actionId]
        action.proxy.element.classList.remove('is-focused')
    }

    consume() {
        const action = ApplicationState.actions[this.actionId]
        action.proxy.container.classList.add('consumed')

        if (action.isShowingSteps) {
            this.destroySteps()
        }
    }

    unConsume() {
        const action = ApplicationState.actions[this.actionId]
        action.proxy.container.classList.remove('consumed')
    }

    focus() {
        const action = ApplicationState.actions[this.actionId]
        // action.proxy.element.classList.add('is-focused')

        // const focus = ApplicationState.visualization.focus
        // assert(focus != null, 'Focus is null')

        // clearExistingFocus()
        // focus.focusedActions.push(action.id)

        // Update time
        const spatialId = action.spatialParentID
        assert(spatialId != null, 'Spatial parent ID is null')

        const spatial = ApplicationState.actions[spatialId]
        assert(spatial.isSpatial, 'Action is not spatial')
        const controlFlow = spatial.controlFlow
        assert(controlFlow != null, 'Control flow is null')

        const selection = ApplicationState.visualization.selections[controlFlow.cursor.selectionIndex]
        selection.targetGlobalTime = action.globalTimeOffset + getTotalDuration(action.id)
    }

    /**
     * Remove division of sub-steps, and show the original action.
     */
    destroySteps() {
        const action = ApplicationState.actions[this.actionId]

        // Destroy abyss
        for (const abyss of action.abyssesIds) {
            destroyAbyss(ApplicationState.abysses[abyss].id)
        }

        action.vertices.forEach((id) => destroyAction(ApplicationState.actions[id]))
        action.vertices = []
        action.edges = []

        action.isShowingSteps = false

        updateAction(action)
    }

    toggleSteps() {
        const action = ApplicationState.actions[this.actionId]

        if (action.isShowingSteps) {
            this.destroySteps()
        } else {
            this.createSteps()
        }
    }

    clicked(): boolean {
        const action = ApplicationState.actions[this.actionId]

        if (Keyboard.instance.isPressed('Alt')) {
            // Grouper
            if (action.proxy.isHovering) {
                collapseActionIntoAbyss(action.id)
                return true
            }
        } else if (Keyboard.instance.isPressed('Control')) {
            if (
                (action.isSpatial && !(action.execution.nodeData.type == 'Program') && action.isShowingSteps) ||
                this.ignoreStepClicks
            ) {
                return false
            }

            action.representation.toggleSteps()
            return true
        } else if (action.proxy.isHovering) {
            // Pointer
            if (isFocused(action.id)) {
                clearExistingFocus()
            } else {
                action.representation.focus()
            }
            return true
        }

        return false
    }

    setupHoverListener() {
        const action = ApplicationState.actions[this.actionId]

        action.proxy.element.addEventListener('mouseenter', (e) => {
            const action = ApplicationState.actions[this.actionId]

            if (action.representation.shouldHover) {
                action.proxy.isHovering = true
                action.proxy.element.classList.add('is-hovering')
            }

            e.preventDefault()
            e.stopPropagation()
        })

        action.proxy.element.addEventListener('mouseleave', (e) => {
            const action = ApplicationState.actions[this.actionId]

            if (action.proxy.isHovering) {
                action.proxy.isHovering = false
                action.proxy.element.classList.remove('is-hovering')
            }

            e.preventDefault()
            e.stopPropagation()
        })
    }

    setupClickListener() {
        const action = ApplicationState.actions[this.actionId]

        action.proxy.element.addEventListener('click', (e) => {
            console.log('Clicked', action.execution.nodeData.type)
            let success = this.clicked()

            if (success) {
                e.preventDefault()
                e.stopPropagation()
            }
        })
    }

    setupEventListeners() {
        this.setupClickListener()
        this.setupHoverListener()
    }

    destroy() {}
}

export function getPrincipleBbox(action: ActionState) {
    assert(action.isSpatial, 'Action is not spatial.')

    const bbox = action.proxy.container.getBoundingClientRect()

    for (const spatialChildId of action.spatialVertices) {
        const spatialChild = ApplicationState.actions[spatialChildId]
        const childBbox = getPrincipleBbox(spatialChild)

        bbox.y = Math.min(bbox.y, childBbox.y)
        bbox.width = Math.max(bbox.width, childBbox.x + childBbox.width - bbox.x)
        bbox.height = Math.max(bbox.height, childBbox.y + childBbox.height - bbox.y)
    }

    return bbox
}
