//@ts-check

import FlowEdge from '../animation/graph/edges/FlowEdge.js';
import { solveLP } from './math.js';

/**
 * @param {number} index
 * @param {Edge[]} edges
 * @returns {number[]} vertices that 'index' is flow dependent on
 */
export function getFlowDependencies(index, edges) {
    return [];
}

/**
 * @param {number} index
 * @param {Edge[]} edges
 * @returns {{ neighbour: number; road: Edge; }[]}
 */
export function getNeighbours(index, edges) {
    const neighbours = [];
    for (const edge of edges) {
        if (edge.from == index) {
            neighbours.push({ neighbour: edge.to, road: edge });
        }
    }

    return neighbours;
}

/**
 * @param {number} index
 * @param {Edge[]} edges
 * @returns {{ neighbour: number; road: Edge; }[]}
 */
export function getOutgoingNeighbours(index, edges) {
    const neighbours = [];
    for (const edge of edges) {
        if (edge.to == index) {
            neighbours.push({ neighbour: edge.from, road: edge });
        }
    }

    return neighbours;
}

/**
 * @param {number} index
 * @param {Edge[]} edges
 * @returns {number[]}
 */
export function getOutgoingFlow(index, edges, mask = new Set()) {
    const outgoing = [];

    const visited = new Set([index]);
    const queue = [index];

    while (queue.length != 0) {
        // Vertex that'll be visited now
        const vertex = queue.shift();

        const neighbours = getNeighbours(vertex, edges);

        for (const { neighbour, road } of neighbours) {
            if (mask.has(neighbour)) continue;

            if (road instanceof FlowEdge) {
                outgoing.push(neighbour);
            }

            if (!visited.has(neighbour)) {
                queue.push(neighbour);
                visited.add(neighbour);
            }
        }
    }

    return outgoing;
}

/**
 * @param {number} index
 * @param {Edge[]} edges
 * @returns {number[]}
 */
export function getIncomingFlow(index, edges, mask = new Set()) {
    const incoming = [];

    const visited = new Set([index]);
    const queue = [index];

    while (queue.length != 0) {
        // Vertex that'll be visited now
        const vertex = queue.shift();

        const neighbours = getOutgoingNeighbours(vertex, edges);

        for (const { neighbour, road } of neighbours) {
            if (mask.has(neighbour)) continue;

            if (road instanceof FlowEdge) {
                incoming.push(neighbour);
            }

            if (!visited.has(neighbour)) {
                queue.push(neighbour);
                visited.add(neighbour);
            }
        }
    }
    return incoming;
}

export function computeStartAndEnd() {
    if (
        !this.isSection &&
        !(this.node.constructor.name == 'BlockStatement') &&
        !(this.node.constructor.name == 'Program')
    )
        return;

    const start = this.vertices[0];
    const end = this.vertices[this.vertices.length - 1];

    // If this is a section, then mark the vertices where it can start, and the vertices where it ends
    for (let j = 1; j < this.vertices.length - 1; j++) {
        const outgoing_flow = getOutgoingFlow(j, this.edges, new Set([0, this.vertices.length - 1]));
        const incoming_flow = getIncomingFlow(j, this.edges, new Set([0, this.vertices.length - 1]));

        if (outgoing_flow.length == 0) {
            this.addEdge(
                new FlowEdge(
                    j,
                    this.vertices.length - 1,
                    // @ts-ignore
                    end.getData.bind(end)
                )
            );
        }

        if (incoming_flow.length == 0) {
            // @ts-ignore
            this.addEdge(new FlowEdge(0, j, start.getData.bind(start)));
        }
    }
}

export function collapseTimes() {
    // Construct the graph into a LP problem
    const variables = this.vertices.map((vertex, i) => `V${i}`);

    // Limits
    let limits = [];
    for (let i = 0; i < this.edges.length; i++) {
        const limit = `E${i}: ${this.edges[i].getConstraint(this.vertices)}`;
        limits.push(limit);
    }

    // Bounds
    let bounds = [];
    for (let i = 0; i < this.vertices.length; i++) {
        const bound = `V${i} >= 0`;
        bounds.push(bound);
    }

    const data = `
Minimize
obj: ${variables.join('+')}


Subject To
${limits.join('\n')}

Bounds
${bounds.join('\n')}

General
${variables.join(' ')}

End`;

    const solution = solveLP(data);

    this.collapsedStarts = [];
    for (let i = 0; i < this.vertices.length; i++) {
        const start = solution.result[`V${i}`];
        this.collapsedStarts.push(start);
    }

    console.log(this.collapsedStarts);
}

// export function graphToString(indent = 0, options = { first: false }) {
//     computeEdges(this);

//     let output = '';

//     let visited_vertices = new Set();
//     let visited_edges = new Set();

//     // Flow edges
//     let prev_value = window['staticIdentifier'];
//     window['staticIdentifier'] = true;

//     for (const edge of this.edges.filter((edge) => edge instanceof FlowEdge)) {
//         if (visited_edges.has(`${edge.to}_${edge.from}`)) continue;

//         visited_vertices.add(edge.to);
//         visited_vertices.add(edge.from);
//         visited_edges.add(`${edge.to}_${edge.from}`);

//         const data = edge.getData();

//         let v1 = this.vertices[edge.from].toString(indent + 1, { first: false });
//         let v2 = this.vertices[edge.to]?.toString(indent + 1, { first: true });
//         if (v2 == null) v2 = '[NULL]';

//         output += `${v1}${data.symbolic_reference} ->${v2}\n`;
//     }

//     // Anti-edges
//     for (const edge of this.edges.filter((edge) => edge instanceof AntiEdge)) {
//         if (visited_edges.has(`${edge.to}_${edge.from}`)) continue;

//         visited_vertices.add(edge.to);
//         visited_vertices.add(edge.from);
//         visited_edges.add(`${edge.to}_${edge.from}`);

//         const data = edge.getData();

//         let v1 = this.vertices[edge.from].toString(indent + 1, { first: false });
//         let v2 = this.vertices[edge.to].toString(indent + 1, { first: true });
//         output += `${v1}${data.symbolic_reference} -:>${v2}\n`;
//     }

//     // Sequential edges
//     for (let i = this.vertices.length - 1; i >= 1; i--) {
//         const from = i - 1;
//         const to = i;

//         if (visited_edges.has(`${to}_${from}`)) continue;

//         visited_vertices.add(to);
//         visited_vertices.add(from);
//         visited_edges.add(`${to}_${from}`);

//         let v1 = this.vertices[from]?.toString(indent + 1, { first: false }) ?? `[${from}_Null]`;
//         let v2 = this.vertices[to]?.toString(indent + 1, { first: true }) ?? `[${to}_Null]`;

//         output = `${v1}--${v2}\n${output}`;
//     }

//     // Left out vertices
//     for (let i = 0; i < this.vertices.length; i++) {
//         if (this.vertices[i] == null) continue;

//         if (!visited_vertices.has(i)) {
//             output += `${this.vertices[i].toString(indent + 1, { first: false })}\n`;
//         }
//     }
//     window['staticIdentifier'] = prev_value;

//     output = `${'\t'.repeat(options.first ? 0 : indent)}[<reference>${this.id}_${
//         this.node?.constructor.name
//     }\n${output}`;

//     output += `${'\t'.repeat(indent)}]`;
//     return output;

//     `${'\t'.repeat(options.first ? 0 : indent)}[${this.id}_${this.constructor.name}]`;
// }