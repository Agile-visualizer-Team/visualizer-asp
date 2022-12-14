import {Graph} from "./models";
import {GraphRendererTheme, VSCODE_THEME} from "./renderer-themes";
import {CytoscapeSnapper} from "./cytoscape-snapper/cytoscape-snapper";

export class GraphRenderer {
    public width: number = 800;
    public height: number = 600;
    public theme: GraphRendererTheme = VSCODE_THEME;

    private generateCytoscapeElements(graph: Graph): object[] {
        const elements: any[] = [];

        graph.nodes.forEach(n => {
            let shape, width, height;
            if (n.label.length > 1) {
                shape = "round-rectangle";
                width = n.label.length * this.theme.node.roundRectangle.widthMultiplier;
                height = this.theme.node.roundRectangle.heightMultiplier;
            } else {
                shape = "ellipse";
                width = this.theme.node.ellipse.sizeMultiplier;
                height = this.theme.node.ellipse.sizeMultiplier;
            }

            elements.push({
                data: {
                    id: n.label,
                    label: n.label,
                    shape: shape,
                    width: width,
                    height: height,
                    color: n.color
                        ? this.convertColorWithThemePalette(n.color)
                        : this.theme.node.borderColor
                }
            });
        });

        graph.edges.forEach(e => {
            elements.push({
                data: {
                    id: e.from + '-' + e.to,
                    source: e.from,
                    target: e.to,
                    weight: e.weight,
                    color: e.color
                        ? this.convertColorWithThemePalette(e.color)
                        : this.theme.edge.lineColor,
                    arrowShape: e.oriented ? 'triangle' : 'none'
                }
            });
        });

        return elements;
    }

    public convertColorWithThemePalette(colorName: string) {
        if (colorName in this.theme.palette) {
            return this.theme.palette[colorName];
        }
        return colorName;
    }

    public generateCytoscapeLayout(graph: Graph): object {
        if (graph.layout === "dagre") {
            return {
                name: 'dagre',
                edgeSep: 70,
                rankDir: 'TB',
                padding: 5
            };
        }
        if (graph.layout === "avsdf") {
            return {
                name: 'avsdf',
                nodeSeparation: 100,
                padding: 5
            };
        }
        throw new Error("Unsupported layout type");
    }

    private generateCytoscapeStyle() {
        return [
            {
                selector: 'node',
                style: {
                    'font-family': this.theme.node.fontFamily,
                    'font-size': this.theme.node.fontSize,
                    'font-weight': this.theme.node.fontWeight,
                    'label': 'data(label)',
                    'background-color': this.theme.node.backgroundColor,
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'border-width': '1px',
                    'border-color': 'data(color)',
                    'color': this.theme.node.textColor,
                    'padding': '0 0 0 100px',
                    'width': 'data(width)',
                    'height': 'data(height)',
                    'shape': 'data(shape)'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 1,
                    'line-color': 'data(color)',
                    'line-style': 'dashed',
                    'line-dash-pattern': [6, 3],
                    'line-dash-offset': 0,
                    'curve-style': 'bezier',
                    'arrow-scale': 0.7,
                    'target-arrow-shape': 'data(arrowShape)',
                    'target-arrow-color': 'data(color)',
                    'source-label': 'data(weight)',
                    'source-text-offset': 18,
                    'font-family': this.theme.edge.fontFamily,
                    'font-size': this.theme.edge.fontSize,
                    'font-weight': this.theme.edge.fontWeight,
                    'color': this.theme.edge.textColor,
                    'text-background-shape': 'round-rectangle',
                    'text-background-padding': '1px',
                    'text-background-color': this.theme.backgroundColor,
                    "text-background-opacity": 1,
                }
            }
        ];
    }

    render(graphs: Graph[],
           onGraphStarted?: (index: number, graph: Graph) => void,
           onGraphCompleted?: (index: number, graph: Graph, output: string) => void) {
        const that = this;
        const snapper = new CytoscapeSnapper();
        const style = that.generateCytoscapeStyle();

        snapper.start().then((snapperInstance) => {
            const renderedPromises: Promise<any>[] = [];

            graphs.forEach((graph, index) => {
                if (onGraphStarted) {
                    onGraphStarted(index, graph);
                }

                const renderingPromise = snapperInstance.shot({
                    elements: that.generateCytoscapeElements(graph),
                    layout: that.generateCytoscapeLayout(graph),
                    style: style,
                    width: that.width,
                    height: that.height,
                    background: that.theme.backgroundColor
                }).then((output) => {
                    if (onGraphCompleted) {
                        onGraphCompleted(index, graph, output.base64);
                    }
                });
                renderedPromises.push(renderingPromise);
            });

            Promise.all(renderedPromises).then(() => {
                snapperInstance.stop();
            });
        });
    }
}