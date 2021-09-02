// import * as astring from 'astring';
// import * as ESTree from 'estree';
// import { AnimationContext } from '../../animation/primitive/AnimationNode';
// import MoveAndPlaceAnimation from '../../animation/primitive/Data/MoveAndPlaceAnimation';
// import UpdateAnimation from '../../animation/primitive/Data/UpdateAnimation';
// import { AccessorType } from '../../environment/data/data';
// import { Evaluator } from '../../executor/Evaluator';
// import { Identifier } from '../Identifier';
// import { Node, NodeMeta } from '../Node';
// import { Transpiler } from '../Transpiler';
// import { MemberExpression } from './BinaryOperations/MemberExpression';

// export class UpdateExpression extends Node {
//     argument: Node;
//     operator: string;
//     newValue: any;

//     constructor(ast: ESTree.UpdateExpression, meta: NodeMeta) {
//         super(ast, meta);

//         this.argument = Transpiler.transpile(ast.argument, meta);
//         this.operator = ast.operator;

//         this.newValue = Evaluator.evaluate(
//             `(${astring.generate(ast)}, ${astring.generate(ast.argument)})`,
//             meta.states.prev
//         ).data;
//     }

//     animation(context: AnimationContext) {
//         const graph = createAnimationGraph(this);

//         const register = [{ type: AccessorType.Register, value: `${this.id}__UpdateExpression` }];
//         const specifier =
//             this.argument instanceof MemberExpression
//                 ? this.argument.getSpecifier()
//                 : (this.argument as Identifier).getSpecifier();

//         // Lift up LHS
//         const copy = this.argument.animation({ ...context, locationHint: specifier, outputRegister: register });
//         addVertex(graph, copy, this.argument);

//         // Apply the operation
//         const update = new UpdateAnimation(register, `${this.operator}`, this.newValue);
//         addVertex(graph, update, this.argument);

//         const move = new MoveAndPlaceAnimation(register, specifier, true);
//         addVertex(graph, move, this);

//         return graph;
//     }
// }
