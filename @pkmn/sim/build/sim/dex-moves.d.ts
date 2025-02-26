import { Ability, AnyObject, Battle, CommonHandlers, ConditionData, Effect, EffectData, ID, ModdedDex, Pokemon, Side, SparseBoostsTable, StatIDExceptHP } from './exported-global-types';
import { BasicEffect } from './dex-data';
/**
 * Describes the acceptable target(s) of a move.
 * adjacentAlly - Only relevant to Doubles or Triples, the move only targets an ally of the user.
 * adjacentAllyOrSelf - The move can target the user or its ally.
 * adjacentFoe - The move can target a foe, but not (in Triples) a distant foe.
 * all - The move targets the field or all Pokémon at once.
 * allAdjacent - The move is a spread move that also hits the user's ally.
 * allAdjacentFoes - The move is a spread move.
 * allies - The move affects all active Pokémon on the user's team.
 * allySide - The move adds a side condition on the user's side.
 * allyTeam - The move affects all unfainted Pokémon on the user's team.
 * any - The move can hit any other active Pokémon, not just those adjacent.
 * foeSide - The move adds a side condition on the foe's side.
 * normal - The move can hit one adjacent Pokémon of your choice.
 * randomNormal - The move targets an adjacent foe at random.
 * scripted - The move targets the foe that damaged the user.
 * self - The move affects the user of the move.
 */
export declare type MoveTarget = 'adjacentAlly' | 'adjacentAllyOrSelf' | 'adjacentFoe' | 'all' | 'allAdjacent' | 'allAdjacentFoes' | 'allies' | 'allySide' | 'allyTeam' | 'any' | 'foeSide' | 'normal' | 'randomNormal' | 'scripted' | 'self';
/** Possible move flags. */
interface MoveFlags {
    bypasssub?: 1;
    bite?: 1;
    bullet?: 1;
    charge?: 1;
    contact?: 1;
    dance?: 1;
    defrost?: 1;
    distance?: 1;
    gravity?: 1;
    heal?: 1;
    mirror?: 1;
    allyanim?: 1;
    nonsky?: 1;
    powder?: 1;
    protect?: 1;
    pulse?: 1;
    punch?: 1;
    recharge?: 1;
    reflectable?: 1;
    snatch?: 1;
    sound?: 1;
}
export interface HitEffect {
    onHit?: MoveEventMethods['onHit'];
    boosts?: SparseBoostsTable | null;
    status?: string;
    volatileStatus?: string;
    sideCondition?: string;
    slotCondition?: string;
    pseudoWeather?: string;
    terrain?: string;
    weather?: string;
}
export interface SecondaryEffect extends HitEffect {
    chance?: number;
    /** Used to flag a secondary effect as added by Poison Touch */
    ability?: Ability;
    /**
     * Applies to Sparkling Aria's secondary effect: Affected by
     * Sheer Force but not Shield Dust.
     */
    dustproof?: boolean;
    /**
     * Gen 2 specific mechanics: Bypasses Substitute only on Twineedle,
     * and allows it to flinch sleeping/frozen targets
     */
    kingsrock?: boolean;
    self?: HitEffect;
}
export interface MoveEventMethods {
    basePowerCallback?: (this: Battle, pokemon: Pokemon, target: Pokemon, move: ActiveMove) => number | false | null;
    /** Return true to stop the move from being used */
    beforeMoveCallback?: (this: Battle, pokemon: Pokemon, target: Pokemon | null, move: ActiveMove) => boolean | void;
    beforeTurnCallback?: (this: Battle, pokemon: Pokemon, target: Pokemon) => void;
    damageCallback?: (this: Battle, pokemon: Pokemon, target: Pokemon) => number | false;
    priorityChargeCallback?: (this: Battle, pokemon: Pokemon) => void;
    onAfterHit?: CommonHandlers['VoidSourceMove'];
    onAfterSubDamage?: (this: Battle, damage: number, target: Pokemon, source: Pokemon, move: ActiveMove) => void;
    onAfterMoveSecondarySelf?: CommonHandlers['VoidSourceMove'];
    onAfterMoveSecondary?: CommonHandlers['VoidMove'];
    onAfterMove?: CommonHandlers['VoidSourceMove'];
    onDamagePriority?: number;
    onDamage?: (this: Battle, damage: number, target: Pokemon, source: Pokemon, effect: Effect) => number | boolean | null | void;
    onBasePower?: CommonHandlers['ModifierSourceMove'];
    onEffectiveness?: (this: Battle, typeMod: number, target: Pokemon | null, type: string, move: ActiveMove) => number | void;
    onHit?: CommonHandlers['ResultMove'];
    onHitField?: CommonHandlers['ResultMove'];
    onHitSide?: (this: Battle, side: Side, source: Pokemon, move: ActiveMove) => boolean | null | "" | void;
    onModifyMove?: (this: Battle, move: ActiveMove, pokemon: Pokemon, target: Pokemon | null) => void;
    onModifyPriority?: CommonHandlers['ModifierSourceMove'];
    onMoveFail?: CommonHandlers['VoidMove'];
    onModifyType?: (this: Battle, move: ActiveMove, pokemon: Pokemon, target: Pokemon) => void;
    onModifyTarget?: (this: Battle, relayVar: {
        target: Pokemon;
    }, pokemon: Pokemon, target: Pokemon, move: ActiveMove) => void;
    onPrepareHit?: CommonHandlers['ResultMove'];
    onTry?: CommonHandlers['ResultSourceMove'];
    onTryHit?: CommonHandlers['ExtResultSourceMove'];
    onTryHitField?: CommonHandlers['ResultMove'];
    onTryHitSide?: (this: Battle, side: Side, source: Pokemon, move: ActiveMove) => boolean | null | "" | void;
    onTryImmunity?: CommonHandlers['ResultMove'];
    onTryMove?: CommonHandlers['ResultSourceMove'];
    onUseMoveMessage?: CommonHandlers['VoidSourceMove'];
}
export interface MoveData extends EffectData, MoveEventMethods, HitEffect {
    name: string;
    /** move index number, used for Metronome rolls */
    num?: number;
    condition?: ConditionData;
    basePower: number;
    accuracy: true | number;
    pp: number;
    category: 'Physical' | 'Special' | 'Status';
    type: string;
    priority: number;
    target: MoveTarget;
    flags: AnyObject;
    /** Hidden Power */
    realMove?: string;
    damage?: number | 'level' | false | null;
    contestType?: string;
    noPPBoosts?: boolean;
    /**
     * ID of the Z-Crystal that calls the move.
     * `true` for Z-Powered status moves like Z-Encore.
     */
    isZ?: boolean | string;
    zMove?: {
        basePower?: number;
        effect?: string;
        boost?: SparseBoostsTable;
    };
    /**
     * `true` for Max moves like Max Airstream. If its a G-Max moves, this is
     * the species ID of the Gigantamax Pokemon that can use this G-Max move.
     */
    isMax?: boolean | string;
    maxMove?: {
        basePower: number;
    };
    ohko?: boolean | string;
    thawsTarget?: boolean;
    heal?: number[] | null;
    forceSwitch?: boolean;
    selfSwitch?: string | boolean;
    selfBoost?: {
        boosts?: SparseBoostsTable;
    };
    selfdestruct?: 'always' | 'ifHit' | boolean;
    breaksProtect?: boolean;
    /**
     * Note that this is only "true" recoil. Other self-damage, like Struggle,
     * crash (High Jump Kick), Mind Blown, Life Orb, and even Substitute and
     * Healing Wish, are sometimes called "recoil" by the community, but don't
     * count as "real" recoil.
     */
    recoil?: [number, number];
    drain?: [number, number];
    mindBlownRecoil?: boolean;
    stealsBoosts?: boolean;
    struggleRecoil?: boolean;
    secondary?: SecondaryEffect | null;
    secondaries?: SecondaryEffect[] | null;
    self?: SecondaryEffect | null;
    alwaysHit?: boolean;
    baseMoveType?: string;
    basePowerModifier?: number;
    critModifier?: number;
    critRatio?: number;
    /**
     * Pokemon for the attack stat. Ability and Item damage modifiers still come from the real attacker.
     */
    overrideOffensivePokemon?: 'target' | 'source';
    /**
     * Physical moves use attack stat modifiers, special moves use special attack stat modifiers.
     */
    overrideOffensiveStat?: StatIDExceptHP;
    /**
     * Pokemon for the defense stat. Ability and Item damage modifiers still come from the real defender.
     */
    overrideDefensivePokemon?: 'target' | 'source';
    /**
     * uses modifiers that match the new stat
     */
    overrideDefensiveStat?: StatIDExceptHP;
    forceSTAB?: boolean;
    ignoreAbility?: boolean;
    ignoreAccuracy?: boolean;
    ignoreDefensive?: boolean;
    ignoreEvasion?: boolean;
    ignoreImmunity?: boolean | {
        [k: string]: boolean;
    };
    ignoreNegativeOffensive?: boolean;
    ignoreOffensive?: boolean;
    ignorePositiveDefensive?: boolean;
    ignorePositiveEvasion?: boolean;
    multiaccuracy?: boolean;
    multihit?: number | number[];
    multihitType?: string;
    noDamageVariance?: boolean;
    nonGhostTarget?: string;
    pressureTarget?: string;
    spreadModifier?: number;
    sleepUsable?: boolean;
    /**
     * Will change target if current target is unavailable. (Dragon Darts)
     */
    smartTarget?: boolean;
    /**
     * Tracks the original target through Ally Switch and other switch-out-and-back-in
     * situations, rather than just targeting a slot. (Stalwart, Snipe Shot)
     */
    tracksTarget?: boolean;
    willCrit?: boolean;
    hasCrashDamage?: boolean;
    isConfusionSelfHit?: boolean;
    isFutureMove?: boolean;
    noMetronome?: string[];
    noSketch?: boolean;
    stallingMove?: boolean;
    baseMove?: string;
}
export declare type ModdedMoveData = MoveData | Partial<Omit<MoveData, 'name'>> & {
    inherit: true;
    igniteBoosted?: boolean;
    settleBoosted?: boolean;
    bodyofwaterBoosted?: boolean;
    longWhipBoost?: boolean;
    gen?: number;
};
export interface Move extends Readonly<BasicEffect & MoveData> {
    readonly effectType: 'Move';
}
interface MoveHitData {
    [targetSlotid: string]: {
        /** Did this move crit against the target? */
        crit: boolean;
        /** The type effectiveness of this move against the target */
        typeMod: number;
        /**
         * Is this move a Z-Move that broke the target's protection?
         * (does 0.25x regular damage)
         */
        zBrokeProtect: boolean;
    };
}
declare type MutableMove = BasicEffect & MoveData;
export interface ActiveMove extends MutableMove {
    readonly name: string;
    readonly effectType: 'Move';
    readonly id: ID;
    num: number;
    weather?: ID;
    status?: ID;
    hit: number;
    moveHitData?: MoveHitData;
    ability?: Ability;
    aerilateBoosted?: boolean;
    allies?: Pokemon[];
    auraBooster?: Pokemon;
    causedCrashDamage?: boolean;
    forceStatus?: ID;
    galvanizeBoosted?: boolean;
    hasAuraBreak?: boolean;
    hasBounced?: boolean;
    hasSheerForce?: boolean;
    /** Is the move called by Dancer? Used to prevent infinite Dancer recursion. */
    isExternal?: boolean;
    lastHit?: boolean;
    magnitude?: number;
    negateSecondary?: boolean;
    normalizeBoosted?: boolean;
    pixilateBoosted?: boolean;
    pranksterBoosted?: boolean;
    refrigerateBoosted?: boolean;
    selfDropped?: boolean;
    selfSwitch?: ID | boolean;
    spreadHit?: boolean;
    stab?: number;
    statusRoll?: string;
    totalDamage?: number | false;
    willChangeForme?: boolean;
    infiltrates?: boolean;
    /**
     * Has this move been boosted by a Z-crystal or used by a Dynamax Pokemon? Usually the same as
     * `isZ` or `isMax`, but hacked moves will have this be `false` and `isZ` / `isMax` be truthy.
     */
    isZOrMaxPowered?: boolean;
}
declare type MoveCategory = 'Physical' | 'Special' | 'Status';
export declare class DataMove extends BasicEffect implements Readonly<BasicEffect & MoveData> {
    readonly effectType: 'Move';
    /** Move type. */
    readonly type: string;
    /** Move target. */
    readonly target: MoveTarget;
    /** Move base power. */
    readonly basePower: number;
    /** Move base accuracy. True denotes a move that always hits. */
    readonly accuracy: true | number;
    /** Critical hit ratio. Defaults to 1. */
    readonly critRatio: number;
    /** Will this move always or never be a critical hit? */
    readonly willCrit?: boolean;
    /** Can this move OHKO foes? */
    readonly ohko?: boolean | string;
    /**
     * Base move type. This is the move type as specified by the games,
     * tracked because it often differs from the real move type.
     */
    readonly baseMoveType: string;
    /**
     * Secondary effect. You usually don't want to access this
     * directly; but through the secondaries array.
     */
    readonly secondary: SecondaryEffect | null;
    /**
     * Secondary effects. An array because there can be more than one
     * (for instance, Fire Fang has both a burn and a flinch
     * secondary).
     */
    readonly secondaries: SecondaryEffect[] | null;
    /**
     * Move priority. Higher priorities go before lower priorities,
     * trumping the Speed stat.
     */
    readonly priority: number;
    /** Move category. */
    readonly category: MoveCategory;
    /**
     * Pokemon for the attack stat. Ability and Item damage modifiers still come from the real attacker.
     */
    readonly overrideOffensivePokemon?: 'target' | 'source';
    /**
     * Physical moves use attack stat modifiers, special moves use special attack stat modifiers.
     */
    readonly overrideOffensiveStat?: StatIDExceptHP;
    /**
     * Pokemon for the defense stat. Ability and Item damage modifiers still come from the real defender.
     */
    readonly overrideDefensivePokemon?: 'target' | 'source';
    /**
     * uses modifiers that match the new stat
     */
    readonly overrideDefensiveStat?: StatIDExceptHP;
    /** Whether or not this move ignores negative attack boosts. */
    readonly ignoreNegativeOffensive: boolean;
    /** Whether or not this move ignores positive defense boosts. */
    readonly ignorePositiveDefensive: boolean;
    /** Whether or not this move ignores attack boosts. */
    readonly ignoreOffensive: boolean;
    /** Whether or not this move ignores defense boosts. */
    readonly ignoreDefensive: boolean;
    /**
     * Whether or not this move ignores type immunities. Defaults to
     * true for Status moves and false for Physical/Special moves.
     */
    readonly ignoreImmunity: AnyObject | boolean;
    /** Base move PP. */
    readonly pp: number;
    /** Whether or not this move can receive PP boosts. */
    readonly noPPBoosts: boolean;
    /** How many times does this move hit? */
    readonly multihit?: number | number[];
    /** Is this move a Z-Move? */
    readonly isZ: boolean | string;
    readonly zMove?: {
        basePower?: number;
        effect?: string;
        boost?: SparseBoostsTable;
    };
    /** Is this move a Max move? */
    readonly isMax: boolean | string;
    /** Max/G-Max move fields */
    readonly maxMove?: {
        basePower: number;
    };
    readonly flags: MoveFlags;
    /** Whether or not the user must switch after using this move. */
    readonly selfSwitch?: ID | boolean;
    /** Move target only used by Pressure. */
    readonly pressureTarget: string;
    /** Move target used if the user is not a Ghost type (for Curse). */
    readonly nonGhostTarget: string;
    /** Whether or not the move ignores abilities. */
    readonly ignoreAbility: boolean;
    /**
     * Move damage against the current target
     * false = move will always fail with "But it failed!"
     * null = move will always silently fail
     * undefined = move does not deal fixed damage
     */
    readonly damage: number | 'level' | false | null;
    /** Whether or not this move hit multiple targets. */
    readonly spreadHit: boolean;
    /** Modifier that affects damage when multiple targets are hit. */
    readonly spreadModifier?: number;
    /**  Modifier that affects damage when this move is a critical hit. */
    readonly critModifier?: number;
    /** Forces the move to get STAB even if the type doesn't match. */
    readonly forceSTAB: boolean;
    /** True if it can't be copied with Sketch. */
    readonly noSketch: boolean;
    /** STAB multiplier (can be modified by other effects) (default 1.5). */
    readonly stab?: number;
    readonly volatileStatus?: ID;
    constructor(data: AnyObject);
}
export declare class DexMoves {
    readonly dex: ModdedDex;
    readonly moveCache: Map<ID, Move>;
    allCache: readonly Move[] | null;
    constructor(dex: ModdedDex);
    get(name?: string | Move): Move;
    getByID(id: ID): Move;
    all(): readonly Move[];
}
export {};
