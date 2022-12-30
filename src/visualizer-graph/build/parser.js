"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphParser = void 0;
const models_1 = require("./models");
const schema_validators_1 = require("./schema-validators");
const expressions_1 = require("./expressions");
class GraphParser {
    constructor(template, answerSets) {
        this.MANDATORY_NODE_VARIABLE = ["label"];
        this.MANDATORY_EDGE_VARIABLE = ["from", "to"];
        if (!(0, schema_validators_1.validateTemplateSchema)(template) && schema_validators_1.validateTemplateSchema.errors) {
            const errorMessages = schema_validators_1.validateTemplateSchema.errors.map(e => {
                const path = e.instancePath || "template";
                return "Template is not valid: " + path + " " + e.message;
            });
            throw Error(errorMessages.join("\n"));
        }
        this.template = template;
        this.template.nodes.forEach((nodeTemplate) => {
            this.checkMandatoryVariables(nodeTemplate.atom.variables, this.MANDATORY_NODE_VARIABLE);
        });
        this.template.edges.forEach((edgeTemplate) => {
            this.checkMandatoryVariables(edgeTemplate.atom.variables, this.MANDATORY_EDGE_VARIABLE);
        });
        if (!(0, schema_validators_1.validateAnswerSetsSchema)(answerSets) && schema_validators_1.validateAnswerSetsSchema.errors) {
            const error = schema_validators_1.validateAnswerSetsSchema.errors[0];
            const path = error.instancePath || "answer sets";
            throw Error("Answer sets are not valid: " + path + " " + error.message);
        }
        if (!answerSets.length) {
            throw Error("Answer set list is empty");
        }
        this.answerSets = answerSets;
    }
    /**
     * It takes a template object, which is validated with a schema, and an array of answer set.
     */
    checkMandatoryVariables(variables, mandatoryVariables) {
        const check = mandatoryVariables.every(value => {
            return variables.includes(value);
        });
        if (!check) {
            throw Error(`Variables provided: \"${variables}\" must contain \"${mandatoryVariables}\"`);
        }
    }
    /**
     * @param answerSet
     * @param atomName
     * @returns An array of strings, where each string is a fact
     */
    extractFactsByAtomNameFromAnswerSet(answerSet, atomName) {
        const regex = new RegExp('^' + atomName + '\\(.+\\)');
        return answerSet.filter(fact => {
            return regex.test(fact);
        });
    }
    /**
     * @returns An array of Graphs.
     */
    parse() {
        return this.answerSets.map((answerSet) => {
            const nodes = [];
            const edges = [];
            this.template.nodes.forEach((nodeTemplate, nodeTemplateIndex) => {
                const variableindexes = this.findVariableIndexes(nodeTemplate.atom.variables);
                const facts = this.extractFactsByAtomNameFromAnswerSet(answerSet.as, nodeTemplate.atom.name);
                facts.forEach((fact) => {
                    nodes.push(this.createNode(fact, variableindexes, nodeTemplateIndex));
                });
            });
            this.template.edges.forEach((edgeTemplate, edgeTemplateIndex) => {
                const variableindexes = this.findVariableIndexes(edgeTemplate.atom.variables);
                const facts = this.extractFactsByAtomNameFromAnswerSet(answerSet.as, edgeTemplate.atom.name);
                facts.forEach((fact) => {
                    edges.push(this.createEdge(fact, variableindexes, edgeTemplateIndex));
                });
            });
            this.checkEdgesConnections(edges, nodes);
            this.assignDefaultNodesColors(nodes, edges);
            this.assignDefaultEdgesColors(edges);
            return {
                nodes: nodes,
                edges: edges,
                layout: this.template.layout
            };
        });
    }
    /**
     * If specified, assign the default color to edges which are not colored
     * @param edges
     * @private
     */
    assignDefaultEdgesColors(edges) {
        edges.filter(e => !e.color && this.template.edges[e.templateIndex].style.color).forEach(e => {
            const edgeTemplate = this.template.edges[e.templateIndex];
            e.color = this.parseColor(edgeTemplate.style.color, e.variables);
        });
    }
    /**
     * If specified, assign the default colors to nodes which are not colored
     * @param nodes
     * @param edges
     * @private
     */
    assignDefaultNodesColors(nodes, edges) {
        nodes.filter(n => !n.color && this.template.nodes[n.templateIndex].style.color).forEach(n => {
            const nodeTemplate = this.template.nodes[n.templateIndex];
            if (!edges.find(e => e.to === n.label)) {
                // Root
                n.color = this.parseColor(nodeTemplate.style.color.root || nodeTemplate.style.color.all, n.variables);
            }
            else if (!edges.find(e => e.from === n.label)) {
                // Leaf
                n.color = this.parseColor(nodeTemplate.style.color.leaf || nodeTemplate.style.color.all, n.variables);
            }
            else {
                // Non-root
                n.color = this.parseColor(nodeTemplate.style.color.nonRoot || nodeTemplate.style.color.all, n.variables);
            }
        });
    }
    // noinspection JSMethodCanBeStatic
    parseColor(color, variables) {
        // color is a string, just return it
        if (typeof color === 'string') {
            return color;
        }
        // color is an object with "if conditions + else" that must be evaluated
        return new expressions_1.ExpressionEvaluator(color).evaluate(variables);
    }
    /**
     * Check if edges are connected to existing nodes
     * @param edges
     * @param nodes
     * @private
     */
    checkEdgesConnections(edges, nodes) {
        edges.forEach((e) => {
            if (!nodes.find(n => n.label === e.from)) {
                throw Error(`edge from <${e.from}> to <${e.to}> is invalid, from node <${e.from}> does not exist`);
            }
            if (!nodes.find(n => n.label === e.to)) {
                throw Error(`edge from <${e.from}> to <${e.to}> is invalid, to node <${e.to}> does not exist`);
            }
        });
    }
    // noinspection JSMethodCanBeStatic
    findVariableIndexes(variables) {
        let values = {};
        for (let i = 0; i < variables.length; i++) {
            values[variables[i]] = i;
        }
        return values;
    }
    // noinspection JSMethodCanBeStatic
    createNode(node, variableIndexes, templateIndex) {
        let node_var = node.split("(")[1].split(")")[0].split(",");
        const variables = {};
        for (let key in variableIndexes) {
            const index = variableIndexes[key];
            variables[key] = node_var[index];
        }
        return (0, models_1.createGraphNode)({
            label: variables['label'],
            color: 'color' in variables ? variables['color'] : null,
            variables: variables,
            templateIndex: templateIndex
        });
    }
    // noinspection JSMethodCanBeStatic
    createEdge(edge, variableIndexes, templateIndex) {
        let edge_var = edge.split("(")[1].split(")")[0].split(",");
        const variables = {};
        for (let key in variableIndexes) {
            const index = variableIndexes[key];
            variables[key] = edge_var[index];
        }
        return (0, models_1.createGraphEdge)({
            from: variables['from'],
            to: variables['to'],
            weight: variables['weight'],
            color: 'color' in variables ? variables['color'] : null,
            variables: variables,
            oriented: this.template.edges[templateIndex].style.oriented,
            templateIndex: templateIndex
        });
    }
}
exports.GraphParser = GraphParser;