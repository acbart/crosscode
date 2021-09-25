//@ts-check

import * as ESTree from 'estree';
import { AnimationGraph } from '../animation/graph/AnimationGraph';
import { AnimationContext, NodeData } from '../animation/primitive/AnimationNode';
import { ViewState } from '../view/ViewState';
import { ArrayExpression } from './Expressions/Array/ArrayExpression';
// import { ArrayExpression } from './Expressions/Array/ArrayExpression';
// import { ArrayExpressionItem } from './Expressions/Array/ArrayExpressionItem';
import { AssignmentExpression } from './Expressions/BinaryOperations/AssigmentExpression';
import { BinaryExpression } from './Expressions/BinaryOperations/BinaryExpression/BinaryExpression';
import { LogicalExpression } from './Expressions/BinaryOperations/LogicalExpression';
import { MemberExpression } from './Expressions/BinaryOperations/MemberExpression';
import { CallExpression } from './Expressions/CallExpression';
import { FunctionCall } from './Functions/FunctionCall';
import { FunctionDeclaration } from './Functions/FunctionDeclaration';
import { ReturnStatement } from './Functions/ReturnStatement';
// import BinaryExpression from './Expressions/BinaryOperations/BinaryExpression/BinaryExpression';
// import { MemberExpression } from './Expressions/BinaryOperations/MemberExpression';
// import { CallExpression } from './Expressions/CallExpression';
// import { FloatingExpressionStatement } from './Expressions/FloatingExpressionStatement';
// import { UpdateExpression } from './Expressions/UpdateExpression';
// import { FunctionStatement } from './Functions/FunctionStatement';
// import { ReturnStatement } from './Functions/ReturnStatement';
import { Identifier } from './Identifier';
import { Literal } from './Literal';
// import { NodeMeta } from './Node';
import { BlockStatement } from './Statements/BlockStatement';
import { IfStatement } from './Statements/Choice/IfStatement';
// import IfStatement from './Statements/Choice/IfStatement';
import { ExpressionStatement } from './Statements/ExpressionStatement';
import { ForStatement } from './Statements/Loops/ForStatement';
import { WhileStatement } from './Statements/Loops/WhileStatement';
// import ForStatement from './Statements/Loops/ForStatement';
// import ForStatementIncrement from './Statements/Loops/ForStatementIncrement';
// import ForStatementIteration from './Statements/Loops/ForStatementIteration';
// import WhileStatement from './Statements/Loops/WhileStatement';
// import WhileStatementIteration from './Statements/Loops/WhileStatementIteration';
import { Program } from './Statements/Program';
import { VariableDeclaration } from './Statements/VariableDeclaration';
import { VariableDeclarator } from './Statements/VariableDeclarator';

export function getNodeData(node: ESTree.Node): NodeData {
  return { location: node.loc, type: node.type };
}

// @TODO: Member expression
// export function getSpecifier(node: ESTree.Node) {
//     if (node.type == 'Identifier') {
//         return [{ type: AccessorType.Symbol, value: node.name }];
//     } else {
//         console.error('Unknown type', node.type);
//     }

//     //     getSpecifier() {
//     //     return [
//     //         { type: AccessorType.Symbol, value: this.object_string },
//     //         {
//     //             type: AccessorType.Index,
//     //             value: Evaluator.evaluate(this.property_string, this.meta.states.current).data,
//     //         },
//     //     ];
//     // }
// }

export class Compiler {
  static compile(ast: ESTree.Node, view: ViewState, context: AnimationContext): AnimationGraph {
    const mapping = {
      // Declarations
      VariableDeclarator,

      BinaryExpression,
      // UpdateExpression,
      // Expressions
      ArrayExpression,
      MemberExpression,
      ExpressionStatement,
      VariableDeclaration,
      AssignmentExpression,
      // Identifier
      Identifier,
      // Literal
      Literal,
      // Programs,
      Program,
      // Statements
      BlockStatement,
      // ForStatementIteration,
      ForStatement,
      // ForStatementIncrement,
      ReturnStatement,

      IfStatement,
      // FloatingExpressionStatement,
      FunctionCall,
      CallExpression,
      // ReturnStatement,
      LogicalExpression,

      // WhileStatementIteration,
      WhileStatement,
      FunctionDeclaration,
    };

    if (mapping[`${ast.type}`] == null) {
      console.warn(`Unknown type ${ast.type}`);
      return;
    }

    const node = new mapping[`${ast.type}`](ast, view, context);
    return node;
  }
}