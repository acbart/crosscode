import { Accessor } from '../../environment/EnvironmentState';
import { ViewState } from '../../view/ViewState';
import { AnimationNode, NodeData, PlayableAnimation } from '../primitive/AnimationNode';
import { AbstractionSpec, AbstractionType } from './abstraction/Abstractor';
import { Edge } from './edges/Edge';
import { getEmptyNodeData } from './graph';

export interface AnimationGraphOptions {
    shouldDissolve?: boolean;
    isSequence?: boolean;
    isSection?: boolean;
    isCollapsed?: boolean;
}

export interface AnimationRuntimeOptions {
    indent?: number;
    baking?: boolean;
    globalTime?: number;
}

export interface AnimationData {
    location: Accessor[];
    id: string;
}

export interface AnimationGraphPath {
    node: AnimationGraph | AnimationNode;
    edge?: Edge;
}

export interface AnimationGraph extends PlayableAnimation {
    // Meta info
    _type: 'AnimationGraph';
    id: string;
    nodeData: NodeData;

    // Invariant to abstraction info
    precondition: ViewState;
    postcondition: ViewState;
    isGroup: boolean;

    // Variant to abstraction info
    abstractions: AnimationGraphVariant[];

    // Index of current abstraction chosen
    currentAbstractionIndex: number;
}

export interface AnimationGraphVariant {
    // Info about the abstraction
    spec: AbstractionSpec;

    // Variant to abstraction info
    vertices: (AnimationGraph | AnimationNode)[];
    edges: Edge[];
    isParallel: boolean;
    parallelStarts: number[];
}

export function instanceOfAnimationGraph(animation: any): animation is AnimationGraph {
    return animation._type == 'AnimationGraph';
}

export function createAnimationGraph(nodeData: NodeData, options: { isGroup?: boolean } = {}): AnimationGraph {
    if (this.id == undefined) this.id = 0;

    return {
        // Meta info
        _type: 'AnimationGraph',
        id: `AG(${++this.id})`,
        nodeData: options.isGroup ? getEmptyNodeData(nodeData) : nodeData,

        // Invariant to abstraction info
        precondition: null,
        postcondition: null,
        isPlaying: false,
        hasPlayed: false,
        speed: 1,
        delay: 0,
        ease: (t) => t,
        isGroup: options.isGroup || false,

        // Variant to abstraction info
        abstractions: [
            {
                spec: { type: AbstractionType.None, value: null },
                vertices: [],
                edges: [],
                isParallel: false,
                parallelStarts: [],
            },
        ],

        currentAbstractionIndex: 0,
    };
}
