import { prisma } from "../lib/prisma.js";
export interface ArcSplitConfig {
  split_mode: "role_based" | "random" | "balanced";
  merge_node_id: string;
  arcs: {
    id: string;
    label: string;
    description?: string;
    player_count: number | "remaining";
    entry_node_id: string;
    required_roles?: string[];
  }[];
}
export interface PlayerInfo {
  odId: string;
  role?: string;
}
export async function initArcSplit(
  partyId: string,
  splitNodeId: string,
  config: ArcSplitConfig,
  players: PlayerInfo[]
) {
  await prisma.arcState.deleteMany({ where: { partyId } });
  const arcState = await prisma.arcState.create({
    data: {
      partyId,
      splitNodeId,
      mergeNodeId: config.merge_node_id,
      status: "active",
    },
  });
  const assignments = assignPlayersToArcs(config, players);
  for (const arcDef of config.arcs) {
    const playerIds = assignments.get(arcDef.id) || [];
    const isSoloArc = playerIds.length === 1;
    const activeArc = await prisma.activeArc.create({
      data: {
        arcStateId: arcState.id,
        arcId: arcDef.id,
        label: arcDef.label,
        entryNodeId: arcDef.entry_node_id,
        currentNodeId: arcDef.entry_node_id,
        status: "active",
        isSoloArc,
      },
    });
    for (const odId of playerIds) {
      await prisma.arcPlayer.create({
        data: {
          activeArcId: activeArc.id,
          odId,
        },
      });
    }
  }
  return getArcState(partyId);
}
function assignPlayersToArcs(
  config: ArcSplitConfig,
  players: PlayerInfo[]
): Map<string, string[]> {
  const assignments = new Map<string, string[]>();
  const unassigned = [...players];
  for (const arc of config.arcs) {
    assignments.set(arc.id, []);
  }
  if (config.split_mode === "role_based") {
    for (const arc of config.arcs) {
      if (!arc.required_roles?.length) continue;
      const arcPlayers = assignments.get(arc.id)!;
      const count =
        typeof arc.player_count === "number" ? arc.player_count : Infinity;
      for (let i = unassigned.length - 1; i >= 0; i--) {
        const player = unassigned[i];
        if (player)
        if (player.role && arc.required_roles.includes(player.role)) {
          if (arcPlayers.length < count) {
            arcPlayers.push(player.odId);
            unassigned.splice(i, 1);
          }
        }
      }
    }
  }
  for (const arc of config.arcs) {
    if (arc.player_count === "remaining") {
      const arcPlayers = assignments.get(arc.id)!;
      for (const player of unassigned) {
        arcPlayers.push(player.odId);
      }
      unassigned.length = 0;
    } else if (typeof arc.player_count === "number") {
      const arcPlayers = assignments.get(arc.id)!;
      const needed = arc.player_count - arcPlayers.length;
      for (let i = 0; i < needed && unassigned.length > 0; i++) {
        const player = unassigned.shift()!;
        arcPlayers.push(player.odId);
      }
    }
  }
  return assignments;
}
export async function getArcState(partyId: string) {
  return prisma.arcState.findUnique({
    where: { partyId },
    include: {
      arcs: {
        include: {
          players: true,
        },
      },
    },
  });
}
export async function getPlayerArc(partyId: string, odId: string) {
  const arcState = await getArcState(partyId);
  if (!arcState) return null;
  for (const arc of arcState.arcs) {
    if (arc.players.some((p) => p.odId === odId)) {
      return arc;
    }
  }
  return null;
}
export async function getArcPlayers(partyId: string, arcId: string) {
  const arcState = await getArcState(partyId);
  if (!arcState) return [];
  const arc = arcState.arcs.find((a) => a.arcId === arcId);
  return arc?.players.map((p) => p.odId) || [];
}
export async function isPlayerInSoloArc(
  partyId: string,
  odId: string
): Promise<boolean> {
  const arc = await getPlayerArc(partyId, odId);
  return arc?.isSoloArc || false;
}
export async function updateArcNode(
  partyId: string,
  arcId: string,
  nodeId: string
) {
  const arcState = await prisma.arcState.findUnique({ where: { partyId } });
  if (!arcState) return null;
  return prisma.activeArc.updateMany({
    where: { arcStateId: arcState.id, arcId },
    data: { currentNodeId: nodeId },
  });
}
export async function markArcAtMerge(partyId: string, arcId: string) {
  const arcState = await prisma.arcState.findUnique({ where: { partyId } });
  if (!arcState) return null;
  return prisma.activeArc.updateMany({
    where: { arcStateId: arcState.id, arcId },
    data: { status: "waiting_at_merge" },
  });
}
export async function areAllArcsAtMerge(partyId: string): Promise<boolean> {
  const arcState = await getArcState(partyId);
  if (!arcState) return false;
  return arcState.arcs.every((arc) => arc.status === "waiting_at_merge");
}
export async function getArcsNotAtMerge(partyId: string): Promise<string[]> {
  const arcState = await getArcState(partyId);
  if (!arcState) return [];
  return arcState.arcs
    .filter((arc) => arc.status !== "waiting_at_merge")
    .map((arc) => arc.arcId);
}
export async function mergeArcs(partyId: string) {
  const arcState = await prisma.arcState.findUnique({ where: { partyId } });
  if (!arcState) return null;
  await prisma.activeArc.updateMany({
    where: { arcStateId: arcState.id },
    data: { status: "completed" },
  });
  return prisma.arcState.update({
    where: { partyId },
    data: { status: "completed" },
  });
}
export async function isPartyInArcSplit(partyId: string): Promise<boolean> {
  const arcState = await prisma.arcState.findUnique({ where: { partyId } });
  return arcState?.status === "active";
}
export async function getMergeNodeId(partyId: string): Promise<string | null> {
  const arcState = await prisma.arcState.findUnique({ where: { partyId } });
  return arcState?.mergeNodeId || null;
}
export async function clearArcState(partyId: string) {
  await prisma.arcState.deleteMany({ where: { partyId } });
}
