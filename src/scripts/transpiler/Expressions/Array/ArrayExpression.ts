// import * as ESTree from 'estree';
// import { AnimationGraph } from '../../../animation/graph/AnimationGraph';
// import { AnimationContext } from '../../../animation/primitive/AnimationNode';
// import { ArrayStartAnimation } from '../../../animation/primitive/Container/ArrayStartAnimation';
// import { AccessorType, Data } from '../../../environment/data/data';
// import { Node, NodeMeta } from '../../Node';
// import { ArrayExpressionItem, ArrayExpressionItemAST } from './ArrayExpressionItem';

// export class ArrayExpression extends Node {
//     elements: ArrayExpressionItem[];
//     data: Data;

//     constructor(ast: ESTree.ArrayExpression, meta: NodeMeta) {
//         super(ast, meta);

//         // Compile each element of the list
//         this.elements = ast.elements.map((el, i) => {
//             const index = { type: 'Literal', value: i, raw: i.toString(), loc: el.loc } as ESTree.Literal;
//             const ast = { type: 'ArrayExpressionItem', item: el, index: index, loc: el.loc } as ArrayExpressionItemAST;
//             return new ArrayExpressionItem(ast, meta);
//         });
//     }

//     animation(context: AnimationContext): AnimationGraph {
//         const graph = createAnimationGraph(this);

//         addVertex(graph, new ArrayStartAnimation(context.outputRegister), this);

//         for (let i = 0; i < this.elements.length; i++) {
//             const animation = this.elements[i].animation({
//                 ...context,
//                 outputRegister: [...context.outputRegister, { type: AccessorType.Index, value: i }],
//                 locationHint: [...context.outputRegister, { type: AccessorType.Index, value: i }],
//             });
//             addVertex(graph, animation, this);
//         }

//         // graph.computeEdges();

//         // // Add sequential dependencies between array elements
//         // for (let i = 0; i < this.elements.length; i++) {
//         //     graph.addEdge(new FlowEdge(0, i + 1, this.getData.bind(this)));
//         // }

//         return graph;
//     }
// }
