/**
 * Role calculation based on prologue choices.
 *
 * Roles:
 * - leader: Takes charge, steps forward, issues commands
 * - scout: Observes, inspects, gathers information
 * - fighter: Takes weapons, confronts, attacks
 * - strategist: Plans, backs away, considers options
 * - support: Helps others, leaves items, shows respect
 */

interface ChoiceRecord {
  nodeId: string;
  choiceId: string;
  timestamp: string;
}

interface RoleScores {
  leader: number;
  scout: number;
  fighter: number;
  strategist: number;
  support: number;
}

// Choice-to-role mapping
const CHOICE_ROLE_WEIGHTS: Record<string, Partial<RoleScores>> = {
  // Prologue choices
  inspect_portal: { scout: 2 },
  look_around: { scout: 1, strategist: 1 },
  step_in: { leader: 2, fighter: 1 },
  back_off: { strategist: 2 },
  take_blade: { fighter: 3 },
  leave_it: { support: 2 },
  begin_battle: { fighter: 1 },

  // Generic patterns (fallback)
  observe: { scout: 1 },
  attack: { fighter: 1 },
  defend: { support: 1 },
  lead: { leader: 1 },
  plan: { strategist: 1 },
  help: { support: 1 },
  command: { leader: 2 },
  intervene: { leader: 1, fighter: 1 },
  bribe: { strategist: 1 },
};

/**
 * Calculate role based on choices made in prologue.
 */
export function calculateRole(choices: ChoiceRecord[]): string {
  const scores: RoleScores = {
    leader: 0,
    scout: 0,
    fighter: 0,
    strategist: 0,
    support: 0,
  };

  for (const choice of choices) {
    const weights = CHOICE_ROLE_WEIGHTS[choice.choiceId];
    if (weights) {
      for (const [role, weight] of Object.entries(weights)) {
        scores[role as keyof RoleScores] += weight;
      }
    }
  }

  // Find the role with highest score
  let maxScore = 0;
  let assignedRole = "support"; // Default role

  for (const [role, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      assignedRole = role;
    }
  }

  return assignedRole;
}

/**
 * Get role description for display.
 */
export function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    leader: "You are a natural Leader. You step forward when others hesitate.",
    scout: "You are a keen Scout. You observe and gather crucial information.",
    fighter: "You are a fierce Fighter. You face danger head-on.",
    strategist: "You are a wise Strategist. You plan before you act.",
    support: "You are a reliable Support. You help others succeed.",
  };

  return descriptions[role] || "Your role has yet to be defined.";
}
