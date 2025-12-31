import type { StoryNode, BuilderResult } from "./types.js";
import { buildNarrativeNode } from "./builders/narrative.builder.js";

export async function renderNode(
    node: StoryNode,
    nextNodeId?: string
): Promise<BuilderResult> {
    switch (node.type) {
        case "narrative":
            return buildNarrativeNode(node, nextNodeId);

        case "choice":
        case "timed":
        case "dm":
        case "memory":
        case "sequence":
        case "combat":
        case "social":
        case "meta":
            throw new Error(`Builder for type "${node.type}" not implemented yet`);

        default:
            throw new Error(`Unknown node type: ${node.type}`);
    }
}
