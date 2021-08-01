import { Environment } from '../../../environment/Environment';
import { AnimationNode, AnimationOptions } from '../AnimationNode';

export default class CreateScopeAnimation extends AnimationNode {
    constructor(options: AnimationOptions = {}) {
        super(options);
    }

    begin(environment: Environment) {
        environment.createScope();
    }

    seek(environment: Environment, time: number) {}

    end(environment: Environment) {}
}