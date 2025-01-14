import { ActiveMove, Battle, Effect, ModdedDex, Move, Pokemon, Side, SpreadMoveDamage, SpreadMoveTargets, ZMoveOptions } from './exported-global-types';
import { Dex } from './dex';
export declare class BattleActions {
    battle: Battle;
    dex: ModdedDex;
    readonly MAX_MOVES: {
        readonly [k: string]: string;
    };
    readonly Z_MOVES: {
        readonly [k: string]: string;
    };
    constructor(battle: Battle);
    switchIn(pokemon: Pokemon, pos: number, sourceEffect?: Effect | null, isDrag?: boolean): boolean | "pursuitfaint";
    dragIn(side: Side, pos: number): boolean;
    runSwitch(pokemon: Pokemon): boolean;
    /**
     * runMove is the "outside" move caller. It handles deducting PP,
     * flinching, full paralysis, etc. All the stuff up to and including
     * the "POKEMON used MOVE" message.
     *
     * For details of the difference between runMove and useMove, see
     * useMove's info.
     *
     * externalMove skips LockMove and PP deduction, mostly for use by
     * Dancer.
     */
    runMove(moveOrMoveName: Move | string, pokemon: Pokemon, targetLoc: number, sourceEffect?: Effect | null, zMove?: string, externalMove?: boolean, maxMove?: string, originalTarget?: Pokemon): void;
    /**
     * useMove is the "inside" move caller. It handles effects of the
     * move itself, but not the idea of using the move.
     *
     * Most caller effects, like Sleep Talk, Nature Power, Magic Bounce,
     * etc use useMove.
     *
     * The only ones that use runMove are Instruct, Pursuit, and
     * Dancer.
     */
    useMove(move: Move | string, pokemon: Pokemon, target?: Pokemon | null, sourceEffect?: Effect | null, zMove?: string, maxMove?: string): boolean;
    useMoveInner(moveOrMoveName: Move | string, pokemon: Pokemon, target?: Pokemon | null, sourceEffect?: Effect | null, zMove?: string, maxMove?: string): boolean;
    /** NOTE: includes single-target moves */
    trySpreadMoveHit(targets: Pokemon[], pokemon: Pokemon, move: ActiveMove, notActive?: boolean): boolean;
    hitStepInvulnerabilityEvent(targets: Pokemon[], pokemon: Pokemon, move: ActiveMove): any;
    hitStepTryHitEvent(targets: Pokemon[], pokemon: Pokemon, move: ActiveMove): any;
    hitStepTypeImmunity(targets: Pokemon[], pokemon: Pokemon, move: ActiveMove): boolean[];
    hitStepTryImmunity(targets: Pokemon[], pokemon: Pokemon, move: ActiveMove): boolean[];
    hitStepAccuracy(targets: Pokemon[], pokemon: Pokemon, move: ActiveMove): boolean[];
    hitStepBreakProtect(targets: Pokemon[], pokemon: Pokemon, move: ActiveMove): undefined;
    hitStepStealBoosts(targets: Pokemon[], pokemon: Pokemon, move: ActiveMove): undefined;
    afterMoveSecondaryEvent(targets: Pokemon[], pokemon: Pokemon, move: ActiveMove): undefined;
    /** NOTE: used only for moves that target sides/fields rather than pokemon */
    tryMoveHit(targetOrTargets: Pokemon | Pokemon[], pokemon: Pokemon, move: ActiveMove): number | undefined | false | '';
    hitStepMoveHitLoop(targets: Pokemon[], pokemon: Pokemon, move: ActiveMove): (number | boolean | undefined)[];
    spreadMoveHit(targets: SpreadMoveTargets, pokemon: Pokemon, moveOrMoveName: ActiveMove, hitEffect?: Dex.HitEffect, isSecondary?: boolean, isSelf?: boolean): [SpreadMoveDamage, SpreadMoveTargets];
    tryPrimaryHitEvent(damage: SpreadMoveDamage, targets: SpreadMoveTargets, pokemon: Pokemon, move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean): SpreadMoveDamage;
    getSpreadDamage(damage: SpreadMoveDamage, targets: SpreadMoveTargets, source: Pokemon, move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean, isSelf?: boolean): SpreadMoveDamage;
    runMoveEffects(damage: SpreadMoveDamage, targets: SpreadMoveTargets, source: Pokemon, move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean, isSelf?: boolean): SpreadMoveDamage;
    selfDrops(targets: SpreadMoveTargets, source: Pokemon, move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean): void;
    secondaries(targets: SpreadMoveTargets, source: Pokemon, move: ActiveMove, moveData: ActiveMove, isSelf?: boolean): void;
    forceSwitch(damage: SpreadMoveDamage, targets: SpreadMoveTargets, source: Pokemon, move: ActiveMove): SpreadMoveDamage;
    moveHit(targets: Pokemon | null | (Pokemon | null)[], pokemon: Pokemon, moveOrMoveName: ActiveMove, moveData?: Dex.HitEffect, isSecondary?: boolean, isSelf?: boolean): number | undefined | false;
    calcRecoilDamage(damageDealt: number, move: Move): number;
    getZMove(move: Move, pokemon: Pokemon, skipChecks?: boolean): string | undefined;
    getActiveZMove(move: Move, pokemon: Pokemon): ActiveMove;
    canZMove(pokemon: Pokemon): ZMoveOptions | undefined;
    getMaxMove(move: Move, pokemon: Pokemon): import("./dex-moves").Move | undefined;
    getActiveMaxMove(move: Move, pokemon: Pokemon): import("./dex-moves").ActiveMove;
    runZPower(move: ActiveMove, pokemon: Pokemon): void;
    targetTypeChoices(targetType: string): boolean;
    combineResults<T extends number | boolean | null | '' | undefined, U extends number | boolean | null | '' | undefined>(left: T, right: U): T | U;
    /**
     * 0 is a success dealing 0 damage, such as from False Swipe at 1 HP.
     *
     * Normal PS return value rules apply:
     * undefined = success, null = silent failure, false = loud failure
     */
    getDamage(source: Pokemon, target: Pokemon, move: string | number | ActiveMove, suppressMessages?: boolean): number | undefined | null | false;
    modifyDamage(baseDamage: number, pokemon: Pokemon, target: Pokemon, move: ActiveMove, suppressMessages?: boolean): number;
    /**
     * Confusion damage is unique - most typical modifiers that get run when calculating
     * damage (e.g. Huge Power, Life Orb, critical hits) don't apply. It also uses a 16-bit
     * context for its damage, unlike the regular damage formula (though this only comes up
     * for base damage).
     */
    getConfusionDamage(pokemon: Pokemon, basePower: number): number;
    canMegaEvo(pokemon: Pokemon): string | null | undefined;
    canUltraBurst(pokemon: Pokemon): "Necrozma-Ultra" | null;
    runMegaEvo(pokemon: Pokemon): boolean;
}
