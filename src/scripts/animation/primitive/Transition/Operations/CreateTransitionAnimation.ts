import {
    AccessorType,
    PrototypicalEnvironmentState,
} from '../../../../environment/EnvironmentState'
import {
    addPrototypicalPath,
    beginPrototypicalPath,
    endPrototypicalPath,
    lookupPrototypicalPathById,
    removePrototypicalPath,
    seekPrototypicalPath,
} from '../../../../path/path'
import {
    createPrototypicalCreatePath,
    PrototypicalCreatePath,
} from '../../../../path/prototypical/PrototypicalCreatePath'
import { duration } from '../../../animation'
import { TransitionAnimationNode } from '../../../graph/abstraction/Transition'
import {
    AnimationData,
    AnimationRuntimeOptions,
} from '../../../graph/AnimationGraph'
import { AnimationOptions, createAnimationNode } from '../../AnimationNode'

export interface TransitionCreate extends TransitionAnimationNode {}

function onBegin(
    animation: TransitionCreate,
    view: PrototypicalEnvironmentState,
    options: AnimationRuntimeOptions
) {
    const environment = view

    let create = lookupPrototypicalPathById(
        environment,
        `Create${animation.id}`
    ) as PrototypicalCreatePath

    if (create == null) {
        create = createPrototypicalCreatePath(
            [{ type: AccessorType.ID, value: animation.output.id }],
            [{ type: AccessorType.ID, value: animation.output.id }],
            `Create${animation.id}`
        )
        addPrototypicalPath(environment, create)
        beginPrototypicalPath(create, environment)
    }
}

function onSeek(
    animation: TransitionCreate,
    view: PrototypicalEnvironmentState,
    time: number,
    options: AnimationRuntimeOptions
) {
    let t = animation.ease(time / duration(animation))
    const environment = view

    const create = lookupPrototypicalPathById(
        environment,
        `Create${animation.id}`
    ) as PrototypicalCreatePath
    seekPrototypicalPath(create, environment, t)
}

function onEnd(
    animation: TransitionCreate,
    view: PrototypicalEnvironmentState,
    options: AnimationRuntimeOptions
) {
    const environment = view
    const create = lookupPrototypicalPathById(
        environment,
        `Create${animation.id}`
    ) as PrototypicalCreatePath
    endPrototypicalPath(create, environment)
    removePrototypicalPath(environment, `Create${animation.id}`)
}

function applyInvariant(
    animation: TransitionCreate,
    view: PrototypicalEnvironmentState
) {
    const environment = view

    let create = lookupPrototypicalPathById(
        environment,
        `Create${animation.id}`
    ) as PrototypicalCreatePath

    if (create == null) {
        create = createPrototypicalCreatePath(
            [{ type: AccessorType.ID, value: animation.output.id }],
            [{ type: AccessorType.ID, value: animation.output.id }],
            `Create${animation.id}`
        )
        addPrototypicalPath(environment, create)
        beginPrototypicalPath(create, environment)
    }
}

export function transitionCreate(
    output: AnimationData,
    origins: AnimationData[],
    options: AnimationOptions = {}
): TransitionCreate {
    return {
        ...createAnimationNode(null, { ...options, delay: 0 }),

        name: 'TransitionCreate',

        output,
        origins,

        // Callbacks
        onBegin,
        onSeek,
        onEnd,

        // Transition
        applyInvariant,
    }
}