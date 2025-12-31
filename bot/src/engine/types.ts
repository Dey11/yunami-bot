export type NodeType =
    | "narrative"
    | "choice"
    | "timed"
    | "dm"
    | "memory"
    | "sequence"
    | "combat"
    | "social"
    | "meta";

export interface PublicEmbed {
    title?: string;
    description?: string;
    image?: string;
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

export interface TypeSpecific {
    timers?: Timer;
    choices?: Choice[];
    selects?: SelectMenu[];
    role_reserved_action?: RoleReservedAction;
    dm_deliveries?: DMDelivery[];
    outcome_rules?: OutcomeRules;
    extra_data?: Record<string, any>;
}

export interface Preconditions {
    required_flags?: string[];
    required_items?: string[];
    min_player_count?: number;
    max_player_count?: number;
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
