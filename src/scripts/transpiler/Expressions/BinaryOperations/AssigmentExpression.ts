import * as astring from 'astring';
import * as ESTree from 'estree';
import { createAnimationGraph } from '../../../animation/graph/AnimationGraph';
import { addVertex } from '../../../animation/graph/graph';
import { AnimationContext } from '../../../animation/primitive/AnimationNode';
import { moveAndPlaceAnimation } from '../../../animation/primitive/Data/MoveAndPlaceAnimation';
import { updateAnimation } from '../../../animation/primitive/Data/UpdateAnimation';
import { AccessorType } from '../../../environment/EnvironmentState';
import { Evaluator } from '../../../executor/Evaluator';
import { Identifier } from '../../Identifier';
import { Literal } from '../../Literal';
import { Node, NodeMeta } from '../../Node';
import { Transpiler } from '../../Transpiler';

export class AssignmentExpression extends Node {
    left: Node;
    right: Node;
    operator: ESTree.AssignmentOperator;
    right_str: string;
    newValue: any;

    constructor(ast: ESTree.AssignmentExpression, meta: NodeMeta) {
        super(ast, meta);

        this.left = Transpiler.transpile(ast.left, meta);
        this.right = Transpiler.transpile(ast.right, meta);

        this.right_str = astring.generate(ast.right);
        this.newValue = Evaluator.evaluate(
            `(${astring.generate(ast)}, ${astring.generate(ast.left)})`,
            meta.states.prev
        ).data;
        this.operator = ast.operator;
    }

    animation(context: AnimationContext) {
        const graph = createAnimationGraph(this);

        const register = [{ type: AccessorType.Register, value: `${this.id}__Assignment` }];

        // const leftSpecifier =
        //     this.left instanceof MemberExpression ? this.left.getSpecifier() : (this.left as Identifier).getSpecifier();

        const leftSpecifier = (this.left as Identifier).getSpecifier();

        if (this.operator == '=') {
            // Right should be in the floating stack
            const right = this.right.animation({
                ...context,
                locationHint: leftSpecifier,
                outputRegister: register,
            });
            addVertex(graph, right, this.right);

            const move = moveAndPlaceAnimation(register, leftSpecifier, right instanceof Literal);
            addVertex(graph, move, this);
        } else {
            // Lift up LHS
            const left = this.left.animation({ ...context, locationHint: leftSpecifier, outputRegister: register });
            addVertex(graph, left, this.left);

            // Apply the operation
            const update = updateAnimation(register, `${this.operator} ${this.right_str}`, this.newValue);
            addVertex(graph, update, this.right);

            const move = moveAndPlaceAnimation(register, leftSpecifier, true);
            addVertex(graph, move, this);
        }

        return graph;
    }
}
