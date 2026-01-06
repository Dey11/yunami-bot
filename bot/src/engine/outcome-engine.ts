import {
  getSessionsMap,
  type PlayerSession,
} from '../quickstart/runtime-graph.js';
import { getPartyByPlayer } from '../quickstart/party-session.js';
import type { StoryNode, Choice } from './types.js';
import type { MultiplayerSession } from '../types/party.js';

export interface NodeInputs {
  nodeId: string;
  playerInputs: Map<string, PlayerInput>;
  timedOut: boolean;
}

export interface PlayerInput {
  playerId: string;
  choiceId?: string;
  selectValues?: string[];
  roleAction?: string;
  timestamp: number;
}

export interface OutcomeResult {
  nextNodeId: string | null;
  stateChanges?: StateChange[];
  message?: string;
}

export interface StateChange {
  type: 'flag' | 'resource' | 'item';
  key: string;
  value: any;
}

const pendingInputs = new Map<string, NodeInputs>();

export function initNodeInputs(nodeId: string, partyId?: string): void {
  const key = partyId ? `${partyId}:${nodeId}` : nodeId;
  pendingInputs.set(key, {
    nodeId,
    playerInputs: new Map(),
    timedOut: false,
  });
}

export function recordPlayerInput(
  nodeId: string,
  playerId: string,
  input: Omit<PlayerInput, 'playerId' | 'timestamp'>,
  partyId?: string
): void {
  const key = partyId ? `${partyId}:${nodeId}` : nodeId;
  let inputs = pendingInputs.get(key);

  if (!inputs) {
    inputs = {
      nodeId,
      playerInputs: new Map(),
      timedOut: false,
    };
    pendingInputs.set(key, inputs);
  }

  inputs.playerInputs.set(playerId, {
    playerId,
    ...input,
    timestamp: Date.now(),
  });
}

export function markTimedOut(nodeId: string, partyId?: string): void {
  const key = partyId ? `${partyId}:${nodeId}` : nodeId;
  const inputs = pendingInputs.get(key);
  if (inputs) {
    inputs.timedOut = true;
  }
}

export function getNodeInputs(
  nodeId: string,
  partyId?: string
): NodeInputs | undefined {
  const key = partyId ? `${partyId}:${nodeId}` : nodeId;
  return pendingInputs.get(key);
}

export function clearNodeInputs(nodeId: string, partyId?: string): void {
  const key = partyId ? `${partyId}:${nodeId}` : nodeId;
  pendingInputs.delete(key);
}

export function hasAllInputs(
  nodeId: string,
  expectedPlayerIds: string[],
  partyId?: string
): boolean {
  const inputs = getNodeInputs(nodeId, partyId);
  if (!inputs) return false;

  for (const playerId of expectedPlayerIds) {
    if (!inputs.playerInputs.has(playerId)) {
      return false;
    }
  }
  return true;
}

export interface VoteSummary {
  totalVotes: number;
  voteCounts: Map<string, number>;
  voters: Map<string, string[]>;
  playerChoices: Map<string, string>;
}

export function getVoteSummary(
  nodeId: string,
  partyId?: string
): VoteSummary | null {
  const inputs = getNodeInputs(nodeId, partyId);
  if (!inputs) return null;

  const voteCounts = new Map<string, number>();
  const voters = new Map<string, string[]>();
  const playerChoices = new Map<string, string>();

  for (const input of inputs.playerInputs.values()) {
    if (input.choiceId) {
      const count = voteCounts.get(input.choiceId) || 0;
      voteCounts.set(input.choiceId, count + 1);

      const voterList = voters.get(input.choiceId) || [];
      voterList.push(input.playerId);
      voters.set(input.choiceId, voterList);

      playerChoices.set(input.playerId, input.choiceId);
    }
  }

  return {
    totalVotes: inputs.playerInputs.size,
    voteCounts,
    voters,
    playerChoices,
  };
}

export function evaluateOutcome(
  node: StoryNode,
  inputs: NodeInputs,
  party?: MultiplayerSession | null
): OutcomeResult {
  const outcomeRules = node.type_specific?.outcome_rules;
  const choices = node.type_specific?.choices || [];

  if (!outcomeRules?.on_all_inputs_or_timeout) {
    return evaluateSimpleMajority(inputs, choices);
  }

  const ruleSet = outcomeRules.on_all_inputs_or_timeout.compute;

  switch (ruleSet) {
    case 'majority':
      return evaluateSimpleMajority(inputs, choices);
    case 'first':
      return evaluateFirstChoice(inputs, choices);
    case 'last':
      return evaluateLastChoice(inputs, choices);
    case 'random':
      return evaluateRandom(inputs, choices);
    default:
      return evaluateSimpleMajority(inputs, choices);
  }
}

function evaluateSimpleMajority(
  inputs: NodeInputs,
  choices: Choice[]
): OutcomeResult {
  const voteCounts = new Map<string, number>();

  for (const input of inputs.playerInputs.values()) {
    if (input.choiceId) {
      const count = voteCounts.get(input.choiceId) || 0;
      voteCounts.set(input.choiceId, count + 1);
    }
  }

  if (inputs.timedOut && voteCounts.size === 0) {
    return {
      nextNodeId: null,
      message: 'Time expired with no votes',
    };
  }

  let maxVotes = 0;
  let winningChoiceId: string | null = null;

  for (const [choiceId, count] of voteCounts.entries()) {
    if (count > maxVotes) {
      maxVotes = count;
      winningChoiceId = choiceId;
    }
  }

  const winningChoice = choices.find((c) => c.id === winningChoiceId);
  const totalVotes = [...voteCounts.values()].reduce((a, b) => a + b, 0);

  return {
    nextNodeId: winningChoice?.nextNodeId ?? null,
    message:
      totalVotes > 1 && winningChoiceId
        ? `Majority chose: ${winningChoice?.label}`
        : undefined,
  };
}

function evaluateFirstChoice(
  inputs: NodeInputs,
  choices: Choice[]
): OutcomeResult {
  let earliest: PlayerInput | null = null;

  for (const input of inputs.playerInputs.values()) {
    if (input.choiceId && (!earliest || input.timestamp < earliest.timestamp)) {
      earliest = input;
    }
  }

  if (!earliest) {
    return { nextNodeId: null };
  }

  const choice = choices.find((c) => c.id === earliest!.choiceId);
  return {
    nextNodeId: choice?.nextNodeId ?? null,
    message:
      inputs.playerInputs.size > 1
        ? `First choice: ${choice?.label}`
        : undefined,
  };
}

function evaluateLastChoice(
  inputs: NodeInputs,
  choices: Choice[]
): OutcomeResult {
  let latest: PlayerInput | null = null;

  for (const input of inputs.playerInputs.values()) {
    if (input.choiceId && (!latest || input.timestamp > latest.timestamp)) {
      latest = input;
    }
  }

  if (!latest) {
    return { nextNodeId: null };
  }

  const choice = choices.find((c) => c.id === latest!.choiceId);
  return {
    nextNodeId: choice?.nextNodeId ?? null,
    message:
      inputs.playerInputs.size > 1
        ? `Last choice: ${choice?.label}`
        : undefined,
  };
}

function evaluateRandom(inputs: NodeInputs, choices: Choice[]): OutcomeResult {
  const choiceIds = Array.from(inputs.playerInputs.values())
    .map((i) => i.choiceId)
    .filter(Boolean) as string[];

  if (choiceIds.length === 0) {
    return { nextNodeId: null };
  }

  const randomId = choiceIds[Math.floor(Math.random() * choiceIds.length)];
  const choice = choices.find((c) => c.id === randomId);

  return {
    nextNodeId: choice?.nextNodeId ?? null,
    message:
      inputs.playerInputs.size > 1
        ? `Random selection: ${choice?.label}`
        : undefined,
  };
}
