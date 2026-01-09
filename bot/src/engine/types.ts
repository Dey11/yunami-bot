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
  allowed_roles?: string[];
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
  allowed_roles?: string[];
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
  allowed_roles?: string[];
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
  allowed_roles?: string[];
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
  allowed_roles?: string[];
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
export interface ArcDefinition {
  id: string;
  label: string;
  description?: string;
  player_count: number | 'remaining';
  entry_node_id: string;
  required_roles?: string[];
  preferred_roles?: string[];
}
export interface ArcSplitConfig {
  split_mode: 'role_based' | 'random';
  arcs: ArcDefinition[];
  merge_node_id: string;
}
export interface ArcContext {
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
  required_arc?: string;
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
  allowed_roles?: string[];
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
