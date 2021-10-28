import { createData } from '../../../environment/data/data';
import { DataState, DataType } from '../../../environment/data/DataState';
import { addDataAt, declareVariable, getMemoryLocation, resolvePath } from '../../../environment/environment';
import { Accessor, accessorsToString } from '../../../environment/EnvironmentState';
import { updateRootViewLayout } from '../../../environment/layout';
import { getCurrentEnvironment } from '../../../view/view';
import { ViewState } from '../../../view/ViewState';
import { AnimationData, AnimationRuntimeOptions } from '../../graph/AnimationGraph';
import { AnimationNode, AnimationOptions, createAnimationNode } from '../AnimationNode';

export interface BindAnimation extends AnimationNode {
    identifier: string;
    existingMemorySpecifier: Accessor[];
}

function onBegin(animation: BindAnimation, view: ViewState, options: AnimationRuntimeOptions) {
    const environment = getCurrentEnvironment(view);

    let data = null;
    let location = null;

    // Create a reference for variable
    const reference = createData(DataType.Reference, [], `${animation.id}_Reference`);
    const loc = addDataAt(environment, reference, [], `${animation.id}_Add`);
    updateRootViewLayout(view);

    if (animation.existingMemorySpecifier != null) {
        data = resolvePath(environment, animation.existingMemorySpecifier, `${animation.id}_Existing`) as DataState;
        location = getMemoryLocation(environment, data).foundLocation;
    } else {
        data = createData(DataType.Literal, undefined, `${animation.id}_BindNew`);
        location = addDataAt(environment, data, [], null);
        updateRootViewLayout(view);
    }

    reference.value = location;

    declareVariable(environment, animation.identifier, loc);
    updateRootViewLayout(view);

    if (options.baking) {
        computeReadAndWrites(animation, { location, id: data.id });
    }
}

function onSeek(animation: BindAnimation, view: ViewState, time: number, options: AnimationRuntimeOptions) {}

function onEnd(animation: BindAnimation, view: ViewState, options: AnimationRuntimeOptions) {}

function computeReadAndWrites(animation: BindAnimation, data: AnimationData) {
    animation._reads = [data];
    animation._writes = [];
}

export function bindAnimation(
    identifier: string,
    existingMemorySpecifier: Accessor[] = null,
    options: AnimationOptions = {}
): BindAnimation {
    return {
        ...createAnimationNode(null, options),
        baseDuration: 5,
        name: `Bind Variable (${identifier}), with data at ${accessorsToString(existingMemorySpecifier ?? [])}`,

        // Attributes
        identifier,
        existingMemorySpecifier,

        // Callbacks
        onBegin,
        onSeek,
        onEnd,
    };
}
