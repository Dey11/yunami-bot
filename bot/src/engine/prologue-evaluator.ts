import type {
  TraitVector,
  TraitMapping,
  PrologueEvaluation,
  PrologueResult,
} from './types.js';

const evaluations = new Map<string, PrologueEvaluation>();

const PERSONALITY_TYPES: Record<
  string,
  { name: string; description: string; requiredTraits: string[] }
> = {
  strategist: {
    name: 'The Strategist',
    description:
      'You approach problems with calculated precision, weighing options before acting.',
    requiredTraits: ['cautious', 'observant', 'analytical'],
  },
  berserker: {
    name: 'The Berserker',
    description:
      'You charge headfirst into danger, relying on instinct and raw power.',
    requiredTraits: ['aggressive', 'brave', 'impulsive'],
  },
  diplomat: {
    name: 'The Diplomat',
    description:
      'Words are your weapon. You resolve conflicts through charm and persuasion.',
    requiredTraits: ['charismatic', 'empathetic', 'peaceful'],
  },
  shadow: {
    name: 'The Shadow',
    description:
      'You move unseen, striking from darkness when opportunity presents itself.',
    requiredTraits: ['stealthy', 'patient', 'cunning'],
  },
  guardian: {
    name: 'The Guardian',
    description:
      'Protection comes naturally. You stand between danger and those who cannot defend themselves.',
    requiredTraits: ['protective', 'selfless', 'brave'],
  },
  seeker: {
    name: 'The Seeker',
    description:
      'Knowledge drives you. Every mystery is a puzzle waiting to be solved.',
    requiredTraits: ['curious', 'observant', 'analytical'],
  },
  wildcard: {
    name: 'The Wildcard',
    description:
      'Unpredictable and adaptable, you thrive in chaos where others falter.',
    requiredTraits: ['impulsive', 'adaptable', 'creative'],
  },
};

const TRAIT_TO_STAT: Record<string, keyof PrologueResult['baseStats']> = {
  aggressive: 'str',
  brave: 'str',
  protective: 'str',
  stealthy: 'dex',
  patient: 'dex',
  quick: 'dex',
  analytical: 'int',
  curious: 'int',
  observant: 'int',
  charismatic: 'cha',
  empathetic: 'cha',
  persuasive: 'cha',
  cautious: 'wis',
  peaceful: 'wis',
  selfless: 'wis',
  resilient: 'con',
  impulsive: 'con',
  adaptable: 'con',
};

const TRAIT_INVENTORY: Record<string, string> = {
  aggressive: 'worn_blade',
  brave: 'courage_charm',
  stealthy: 'shadow_cloak',
  analytical: 'scholars_tome',
  charismatic: 'silver_tongue_ring',
  cautious: 'protective_amulet',
  curious: 'explorers_compass',
  protective: 'guardians_shield',
};

export function initPrologueEvaluation(odId: string): void {
  evaluations.set(odId, {
    traitVector: {},
    puzzlePerformance: new Map(),
    totalChoices: 0,
    startTime: Date.now(),
  });
}

export function getPrologueEvaluation(
  odId: string
): PrologueEvaluation | undefined {
  return evaluations.get(odId);
}

export function recordPrologueChoice(
  odId: string,
  choiceId: string,
  traitMappings?: TraitMapping
): void {
  const evaluation = evaluations.get(odId);
  if (!evaluation) return;

  evaluation.totalChoices++;

  if (traitMappings && traitMappings[choiceId]) {
    const traits = traitMappings[choiceId];
    for (const [trait, value] of Object.entries(traits)) {
      evaluation.traitVector[trait] =
        (evaluation.traitVector[trait] || 0) + value;
    }
  }
}

export function recordPuzzlePerformance(
  odId: string,
  nodeId: string,
  timeTaken: number,
  attempts: number
): void {
  const evaluation = evaluations.get(odId);
  if (!evaluation) return;

  evaluation.puzzlePerformance.set(nodeId, { timeTaken, attempts });

  if (attempts === 1) {
    evaluation.traitVector['analytical'] =
      (evaluation.traitVector['analytical'] || 0) + 2;
  }
  if (timeTaken < 10000) {
    evaluation.traitVector['quick'] =
      (evaluation.traitVector['quick'] || 0) + 1;
  } else if (timeTaken > 30000) {
    evaluation.traitVector['patient'] =
      (evaluation.traitVector['patient'] || 0) + 1;
  }
}

export function applyTraitAdjustment(
  odId: string,
  trait: string,
  value: number
): void {
  const evaluation = evaluations.get(odId);
  if (!evaluation) return;

  evaluation.traitVector[trait] = (evaluation.traitVector[trait] || 0) + value;
}

function getDominantTraits(traitVector: TraitVector): string[] {
  const sortedTraits = Object.entries(traitVector)
    .filter(([_, value]) => value > 0)
    .sort(([, a], [, b]) => b - a);

  return sortedTraits.slice(0, 3).map(([trait]) => trait);
}

function matchPersonalityType(dominantTraits: string[]): {
  name: string;
  description: string;
} {
  let bestMatch = {
    name: 'The Wanderer',
    description: 'Your path is yours alone to define.',
  };
  let bestScore = 0;

  for (const [_, personality] of Object.entries(PERSONALITY_TYPES)) {
    let score = 0;
    for (const trait of personality.requiredTraits) {
      if (dominantTraits.includes(trait)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        name: personality.name,
        description: personality.description,
      };
    }
  }

  return bestMatch;
}

function calculateBaseStats(
  traitVector: TraitVector
): PrologueResult['baseStats'] {
  const stats: PrologueResult['baseStats'] = {
    str: 10,
    dex: 10,
    int: 10,
    cha: 10,
    wis: 10,
    con: 10,
  };

  for (const [trait, value] of Object.entries(traitVector)) {
    const stat = TRAIT_TO_STAT[trait];
    if (stat && value > 0) {
      stats[stat] += Math.floor(value / 2);
    }
  }

  for (const key of Object.keys(stats) as (keyof typeof stats)[]) {
    stats[key] = Math.min(20, Math.max(1, stats[key]));
  }

  return stats;
}

function determineStartingInventory(dominantTraits: string[]): string[] {
  const inventory: string[] = ['basic_supplies'];

  for (const trait of dominantTraits) {
    if (TRAIT_INVENTORY[trait]) {
      inventory.push(TRAIT_INVENTORY[trait]);
    }
  }

  return inventory.slice(0, 4);
}

export function finalizePrologueProfile(odId: string): PrologueResult | null {
  const evaluation = evaluations.get(odId);
  if (!evaluation) return null;

  const dominantTraits = getDominantTraits(evaluation.traitVector);
  const personality = matchPersonalityType(dominantTraits);
  const baseStats = calculateBaseStats(evaluation.traitVector);
  const startingInventory = determineStartingInventory(dominantTraits);

  return {
    baseStats,
    personalityType: personality.name,
    personalityDescription: personality.description,
    dominantTraits,
    startingInventory,
  };
}

export function clearPrologueEvaluation(odId: string): void {
  evaluations.delete(odId);
}

export function isPrologueActive(odId: string): boolean {
  return evaluations.has(odId);
}
