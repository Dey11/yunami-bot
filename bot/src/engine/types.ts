export type NodeType =
  | 'narrative'
  | 'choice'
  | 'timed'
  | 'dm'
  | 'memory'
  | 'sequence'
  | 'combat'
  | 'social'
  | 'meta'
  | 'arc_split'
  | 'arc_merge';

export interface PublicEmbed {
  title?: string;
  description?: string;
  image?: string;
  caption?: string;
  footer?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

export interface Choice {
  id: string;
  label: string;
  emoji?: string;
  style?: number;
  cost?: Record<string, number>;
  ephemeral_confirmation?: boolean;
  nextNodeId?: string | null;
}

export interface SelectOption {
  id: string;
  label: string;
  emoji?: string;
}

export interface SelectMenu {
  id: string;
  placeholder?: string;
  min?: number;
  max?: number;
  options: SelectOption[];
}

export interface RoleReservedAction {
  id: string;
  label: string;
  requires_team_role: string;
  visible_to_all?: boolean;
}

export interface DMDelivery {
  recipient_role: string;
  content: { text: string };
}

export interface Timer {
  duration_seconds: number;
}

export interface OutcomeRules {
  on_all_inputs_or_timeout?: { compute: string };
}

export interface SequenceStep {
  id: string;
  label: string;
  emoji?: string;
}

export interface SequenceConfig {
  steps: SequenceStep[];
  correct_order: string[];
  max_attempts?: number;
  on_success?: string;
  on_failure?: string;
}

export interface SocialApproach {
  id: string;
  label: string;
  emoji?: string;
  style?: number;
  reputation_required?: number;
  reputation_change?: number;
  success_chance?: number;
  on_success?: string;
  on_failure?: string;
}

export interface SocialConfig {
  npc_name: string;
  npc_image?: string;
  current_standing?: string;
  approaches: SocialApproach[];
  reputation_stat?: string;
  timer_seconds?: number;
}

export interface MemoryConfig {
  question: string;
  correct_answers: string[];
  case_sensitive?: boolean;
  hints?: string[];
  max_attempts?: number;
  on_success?: string;
  on_failure?: string;
}

export interface CombatAction {
  id: string;
  label: string;
  emoji?: string;
  style?: number;
  damage_range?: [number, number];
  defense_bonus?: number;
  dodge_chance?: number;
  cost?: Record<string, number>;
}

export interface CombatEnemy {
  id: string;
  name: string;
  hp: number;
  max_hp: number;
  damage_range: [number, number];
  image?: string;
}

export interface CombatState {
  player_hp: number;
  enemies: { id: string; hp: number }[];
  defending: boolean;
  turn: number;
}

export interface CombatConfig {
  enemies: CombatEnemy[];
  player_hp: number;
  player_max_hp: number;
  actions: CombatAction[];
  threat_level?: number;
  on_victory?: string;
  on_defeat?: string;
  on_flee?: string;
}

// ============ Arc System Types ============

/**
 * Arc definition within an arc_split node.
 * Defines a parallel story path for a subset of players.
 */
export interface ArcDefinition {
  /** Unique ID for this arc, e.g., "solo_scout", "main_team" */
  id: string;
  /** Display name for the arc */
  label: string;
  /** Description of what this arc is about */
  description?: string;
  /** Number of players for this arc, or 'remaining' for last arc */
  player_count: number | 'remaining';
  /** First node ID when entering this arc */
  entry_node_id: string;
  /** Roles required for this arc (triggers role_based assignment) */
  required_roles?: string[];
  /** Roles preferred but not required */
  preferred_roles?: string[];
}

/**
 * Configuration for arc_split nodes.
 * Defines how players are split into parallel arcs.
 */
export interface ArcSplitConfig {
  /** How to assign players to arcs */
  split_mode: 'role_based' | 'random';
  /** List of arc definitions */
  arcs: ArcDefinition[];
  /** Node ID where all arcs converge back together */
  merge_node_id: string;
}

/**
 * Context for nodes that exist within an arc.
 * Indicates which arc a node belongs to.
 */
export interface ArcContext {
  /** Which arc this node belongs to */
  arc_id: string;
}

export interface TypeSpecific {
  timers?: Timer;
  choices?: Choice[];
  selects?: SelectMenu[];
  role_reserved_action?: RoleReservedAction;
  dm_deliveries?: DMDelivery[];
  outcome_rules?: OutcomeRules;
  sequence?: SequenceConfig;
  social?: SocialConfig;
  memory?: MemoryConfig;
  combat?: CombatConfig;
  arc_split?: ArcSplitConfig;
  arc_context?: ArcContext;
  extra_data?: Record<string, any>;
}

export interface Preconditions {
  required_flags?: string[];
  required_items?: string[];
  min_player_count?: number;
  max_player_count?: number;
  /** Must be in this arc to access this node */
  required_arc?: string;
  /** Cannot access if in any of these arcs */
  excluded_arcs?: string[];
}

export interface SideEffectsOnEnter {
  run_script?: string;
  spawn_dm_jobs?: boolean;
}

export interface UIHints {
  disable_after_click?: boolean;
  hide_choices_when_locked?: boolean;
  edit_existing_embed?: boolean;
}

export interface StoryNode {
  id: string;
  schema_version: number;
  type: NodeType;
  title?: string;
  tags?: string[];
  author_note?: string;
  public_embed?: PublicEmbed;
  type_specific?: TypeSpecific;
  preconditions?: Preconditions;
  side_effects_on_enter?: SideEffectsOnEnter;
  ui_hints?: UIHints;
}

export interface BuilderResult {
  embed: any;
  components: any[] | null;
  attachment?: any;
  timer?: Timer;
}

export type TraitVector = Record<string, number>;

export interface TraitMapping {
  [choiceId: string]: Record<string, number>;
}

export interface PrologueEvaluation {
  traitVector: TraitVector;
  puzzlePerformance: Map<string, { timeTaken: number; attempts: number }>;
  totalChoices: number;
  startTime: number;
}

export interface PrologueResult {
  baseStats: {
    str: number;
    dex: number;
    int: number;
    cha: number;
    wis: number;
    con: number;
  };
  personalityType: string;
  personalityDescription: string;
  dominantTraits: string[];
  startingInventory: string[];
}