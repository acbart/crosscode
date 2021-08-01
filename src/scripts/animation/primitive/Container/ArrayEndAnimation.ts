import { AccessorType, Data } from '../../../environment/Data';
import { Environment } from '../../../environment/Environment';
import { AnimationNode, AnimationOptions } from '../AnimationNode';

export class ArrayEndAnimation extends AnimationNode {
    constructor(options: AnimationOptions = {}) {
        super(options);

        this.base_duration = 5;
    }

    begin(environment: Environment) {
        const LatestExpression = environment.resolvePath([{ type: AccessorType.Symbol, value: '_LatestExpression' }], {
            noResolvingId: true,
        }) as Data;

        const ArrayExpression = environment.resolvePath([{ type: AccessorType.Symbol, value: '_ArrayExpression' }], {
            noResolvingId: true,
        }) as Data;

        LatestExpression.value = ArrayExpression.id;
    }

    seek(environment: Environment, time: number) {}

    end(environment: Environment) {
        // const input = view.find(this.inputSpecifier);
        // const output = view.find(this.outputSpecifier);
        // input.type = 'Array';
        // input.value = [];
        // output.value = input;
        // // Create the array container - TODO: incorporate indexer
        // const arrayContainer = new ArrayContainer();
        // output.container.addContainer(arrayContainer);
        // input.container = arrayContainer;
    }
}