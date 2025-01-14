import { ActiveMove, AnyObject, Effect, Format, GameType, ID, ModdedDex, Move, PlayerOptions, PokemonSet, PokemonSlot, SideID, SparseBoostsTable, SpreadMoveDamage, StatsTable } from './exported-global-types';
/**
 * Simulator Battle
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * This file is where the battle simulation itself happens.
 *
 * The most important part of the simulation is the event system:
 * see the `runEvent` function definition for details.
 *
 * General battle mechanics are in `battle-actions`; move-specific,
 * item-specific, etc mechanics are in the corresponding file in
 * `data`.
 *
 * @license MIT
 */
import { Dex } from './dex';
import { Teams } from './teams';
import { Field } from './field';
import { Pokemon, EffectState } from './pokemon';
import { PRNG, PRNGSeed } from './prng';
import { Side } from './side';
import { BattleQueue, Action } from './battle-queue';
import { BattleActions } from './battle-actions';
interface BattleOptions {
    format?: Format;
    formatid: ID;
    /** Output callback */
    send?: (type: string, data: string | string[]) => void;
    prng?: PRNG;
    seed?: PRNGSeed;
    rated?: boolean | string;
    p1?: PlayerOptions;
    p2?: PlayerOptions;
    p3?: PlayerOptions;
    p4?: PlayerOptions;
    debug?: boolean;
    deserialized?: boolean;
    strictChoices?: boolean;
}
interface EventListenerWithoutPriority {
    effect: Effect;
    target?: Pokemon;
    index?: number;
    callback?: Function;
    state: EffectState | null;
    end: Function | null;
    endCallArgs?: any[];
    effectHolder: Pokemon | Side | Field | Battle;
}
interface EventListener extends EventListenerWithoutPriority {
    order: number | false;
    priority: number;
    subOrder: number;
    speed?: number;
}
declare type Part = string | number | boolean | Pokemon | Side | Effect | Move | null | undefined;
export declare type RequestState = 'teampreview' | 'move' | 'switch' | '';
export declare class Battle {
    readonly id: ID;
    readonly debugMode: boolean;
    readonly deserialized: boolean;
    readonly strictChoices: boolean;
    readonly format: Format;
    readonly formatData: EffectState;
    readonly gameType: GameType;
    /**
     * The number of active pokemon per half-field.
     * See header comment in side.ts for details.
     */
    readonly activePerHalf: 1 | 2 | 3;
    readonly field: Field;
    readonly sides: [Side, Side] | [Side, Side, Side, Side];
    readonly prngSeed: PRNGSeed;
    dex: ModdedDex;
    gen: number;
    ruleTable: Dex.RuleTable;
    prng: PRNG;
    rated: boolean | string;
    reportExactHP: boolean;
    reportPercentages: boolean;
    supportCancel: boolean;
    actions: BattleActions;
    queue: BattleQueue;
    readonly faintQueue: {
        target: Pokemon;
        source: Pokemon | null;
        effect: Effect | null;
    }[];
    readonly log: string[];
    readonly inputLog: string[];
    readonly messageLog: string[];
    sentLogPos: number;
    sentEnd: boolean;
    requestState: RequestState;
    turn: number;
    midTurn: boolean;
    started: boolean;
    ended: boolean;
    winner?: string;
    effect: Effect;
    effectState: EffectState;
    event: AnyObject;
    events: AnyObject | null;
    eventDepth: number;
    activeMove: ActiveMove | null;
    activePokemon: Pokemon | null;
    activeTarget: Pokemon | null;
    lastMove: ActiveMove | null;
    lastSuccessfulMoveThisTurn: ID | null;
    lastMoveLine: number;
    /** The last damage dealt by a move in the battle - only used by Gen 1 Counter. */
    lastDamage: number;
    abilityOrder: number;
    quickClawRoll: boolean;
    teamGenerator: ReturnType<typeof Teams.getGenerator> | null;
    readonly hints: Set<string>;
    readonly NOT_FAIL: '';
    readonly HIT_SUBSTITUTE: 0;
    readonly FAIL: false;
    readonly SILENT_FAIL: null;
    readonly send: (type: string, data: string | string[]) => void;
    trunc: (num: number, bits?: number) => number;
    clampIntRange: (num: any, min?: number, max?: number) => number;
    toID: typeof import("./dex-data").toID;
    constructor(options: BattleOptions);
    toJSON(): AnyObject;
    static fromJSON(serialized: string | AnyObject): Battle;
    get p1(): Side;
    get p2(): Side;
    get p3(): Side | undefined;
    get p4(): Side | undefined;
    toString(): string;
    random(m?: number, n?: number): number;
    randomChance(numerator: number, denominator: number): boolean;
    sample<T>(items: readonly T[]): T;
    /** Note that passing `undefined` resets to the starting seed, but `null` will roll a new seed */
    resetRNG(seed?: PRNGSeed | null): void;
    suppressingAbility(target?: Pokemon): boolean | null | undefined;
    setActiveMove(move?: ActiveMove | null, pokemon?: Pokemon | null, target?: Pokemon | null): void;
    clearActiveMove(failed?: boolean): void;
    updateSpeed(): void;
    /**
     * The default sort order for actions, but also event listeners.
     *
     * 1. Order, low to high (default last)
     * 2. Priority, high to low (default 0)
     * 3. Speed, high to low (default 0)
     * 4. SubOrder, low to high (default 0)
     *
     * Doesn't reference `this` so doesn't need to be bound.
     */
    comparePriority(a: AnyObject, b: AnyObject): number;
    static compareRedirectOrder(a: AnyObject, b: AnyObject): number;
    static compareLeftToRightOrder(a: AnyObject, b: AnyObject): number;
    /** Sort a list, resolving speed ties the way the games do. */
    speedSort<T>(list: T[], comparator?: (a: T, b: T) => number): void;
    /**
     * Runs an event with no source on each Pokémon on the field, in Speed order.
     */
    eachEvent(eventid: string, effect?: Effect, relayVar?: boolean): void;
    /**
     * Runs an event with no source on each effect on the field, in Speed order.
     *
     * Unlike `eachEvent`, this contains a lot of other handling and is intended only for the residual step.
     */
    residualEvent(eventid: string, relayVar?: any): void;
    /** The entire event system revolves around this function and runEvent. */
    singleEvent(eventid: string, effect: Effect, state: AnyObject | null, target: string | Pokemon | Side | Field | Battle | null, source?: string | Pokemon | Effect | false | null, sourceEffect?: Effect | string | null, relayVar?: any, customCallback?: unknown): any;
    /**
     * runEvent is the core of Pokemon Showdown's event system.
     *
     * Basic usage
     * ===========
     *
     *   this.runEvent('Blah')
     * will trigger any onBlah global event handlers.
     *
     *   this.runEvent('Blah', target)
     * will additionally trigger any onBlah handlers on the target, onAllyBlah
     * handlers on any active pokemon on the target's team, and onFoeBlah
     * handlers on any active pokemon on the target's foe's team
     *
     *   this.runEvent('Blah', target, source)
     * will additionally trigger any onSourceBlah handlers on the source
     *
     *   this.runEvent('Blah', target, source, effect)
     * will additionally pass the effect onto all event handlers triggered
     *
     *   this.runEvent('Blah', target, source, effect, relayVar)
     * will additionally pass the relayVar as the first argument along all event
     * handlers
     *
     * You may leave any of these null. For instance, if you have a relayVar but
     * no source or effect:
     *   this.runEvent('Damage', target, null, null, 50)
     *
     * Event handlers
     * ==============
     *
     * Items, abilities, statuses, and other effects like SR, confusion, weather,
     * or Trick Room can have event handlers. Event handlers are functions that
     * can modify what happens during an event.
     *
     * event handlers are passed:
     *   function (target, source, effect)
     * although some of these can be blank.
     *
     * certain events have a relay variable, in which case they're passed:
     *   function (relayVar, target, source, effect)
     *
     * Relay variables are variables that give additional information about the
     * event. For instance, the damage event has a relayVar which is the amount
     * of damage dealt.
     *
     * If a relay variable isn't passed to runEvent, there will still be a secret
     * relayVar defaulting to `true`, but it won't get passed to any event
     * handlers.
     *
     * After an event handler is run, its return value helps determine what
     * happens next:
     * 1. If the return value isn't `undefined`, relayVar is set to the return
     *    value
     * 2. If relayVar is falsy, no more event handlers are run
     * 3. Otherwise, if there are more event handlers, the next one is run and
     *    we go back to step 1.
     * 4. Once all event handlers are run (or one of them results in a falsy
     *    relayVar), relayVar is returned by runEvent
     *
     * As a shortcut, an event handler that isn't a function will be interpreted
     * as a function that returns that value.
     *
     * You can have return values mean whatever you like, but in general, we
     * follow the convention that returning `false` or `null` means
     * stopping or interrupting the event.
     *
     * For instance, returning `false` from a TrySetStatus handler means that
     * the pokemon doesn't get statused.
     *
     * If a failed event usually results in a message like "But it failed!"
     * or "It had no effect!", returning `null` will suppress that message and
     * returning `false` will display it. Returning `null` is useful if your
     * event handler already gave its own custom failure message.
     *
     * Returning `undefined` means "don't change anything" or "keep going".
     * A function that does nothing but return `undefined` is the equivalent
     * of not having an event handler at all.
     *
     * Returning a value means that that value is the new `relayVar`. For
     * instance, if a Damage event handler returns 50, the damage event
     * will deal 50 damage instead of whatever it was going to deal before.
     *
     * Useful values
     * =============
     *
     * In addition to all the methods and attributes of Dex, Battle, and
     * Scripts, event handlers have some additional values they can access:
     *
     * this.effect:
     *   the Effect having the event handler
     * this.effectState:
     *   the data store associated with the above Effect. This is a plain Object
     *   and you can use it to store data for later event handlers.
     * this.effectState.target:
     *   the Pokemon, Side, or Battle that the event handler's effect was
     *   attached to.
     * this.event.id:
     *   the event ID
     * this.event.target, this.event.source, this.event.effect:
     *   the target, source, and effect of the event. These are the same
     *   variables that are passed as arguments to the event handler, but
     *   they're useful for functions called by the event handler.
     */
    runEvent(eventid: string, target?: Pokemon | Pokemon[] | Side | Battle | null, source?: string | Pokemon | false | null, sourceEffect?: Effect | null, relayVar?: any, onEffect?: boolean, fastExit?: boolean): any;
    /**
     * priorityEvent works just like runEvent, except it exits and returns
     * on the first non-undefined value instead of only on null/false.
     */
    priorityEvent(eventid: string, target: Pokemon | Side | Battle, source?: Pokemon | null, effect?: Effect, relayVar?: any, onEffect?: boolean): any;
    resolvePriority(handler: EventListenerWithoutPriority, callbackName: string): EventListener;
    findEventHandlers(target: Pokemon | Pokemon[] | Side | Battle, eventName: string, source?: Pokemon | null): EventListener[];
    findPokemonEventHandlers(pokemon: Pokemon, callbackName: string, getKey?: 'duration'): EventListener[];
    findBattleEventHandlers(callbackName: string, getKey?: 'duration'): EventListener[];
    findFieldEventHandlers(field: Field, callbackName: string, getKey?: 'duration', customHolder?: Pokemon): EventListener[];
    findSideEventHandlers(side: Side, callbackName: string, getKey?: 'duration', customHolder?: Pokemon): EventListener[];
    /**
     * Use this function to attach custom event handlers to a battle. See Battle#runEvent for
     * more information on how to write callbacks for event handlers.
     *
     * Try to use this sparingly. Most event handlers can be simply placed in a format instead.
     *
     *     this.onEvent(eventid, target, callback)
     * will set the callback as an event handler for the target when eventid is called with the
     * default priority. Currently only valid formats are supported as targets but this will
     * eventually be expanded to support other target types.
     *
     *     this.onEvent(eventid, target, priority, callback)
     * will set the callback as an event handler for the target when eventid is called with the
     * provided priority. Priority can either be a number or an object that contains the priority,
     * order, and subOrder for the event handler as needed (undefined keys will use default values)
     */
    onEvent(eventid: string, target: Format, ...rest: AnyObject[]): void;
    checkMoveMakesContact(move: ActiveMove, attacker: Pokemon, defender: Pokemon, announcePads?: boolean): any;
    getPokemon(fullname: string | Pokemon): Pokemon | null;
    getAllPokemon(): Pokemon[];
    getAllActive(): Pokemon[];
    makeRequest(type?: RequestState): void;
    clearRequest(): void;
    getRequests(type: RequestState): AnyObject[];
    tiebreak(): boolean;
    forceWin(side?: SideID | null): boolean;
    tie(): boolean;
    win(side?: SideID | '' | Side | null): boolean;
    lose(side: SideID | Side): boolean | undefined;
    canSwitch(side: Side): number;
    getRandomSwitchable(side: Side): Pokemon | null;
    private possibleSwitches;
    swapPosition(pokemon: Pokemon, newPosition: number, attributes?: string): boolean;
    getAtSlot(slot: PokemonSlot): Pokemon;
    getAtSlot(slot: PokemonSlot | null): Pokemon | null;
    faint(pokemon: Pokemon, source?: Pokemon, effect?: Effect): void;
    nextTurn(): void;
    maybeTriggerEndlessBattleClause(trappedBySide: boolean[], stalenessBySide: ('internal' | 'external' | undefined)[]): boolean | undefined;
    start(): void;
    restart(send?: (type: string, data: string | string[]) => void): void;
    checkEVBalance(): void;
    boost(boost: SparseBoostsTable, target?: Pokemon | null, source?: Pokemon | null, effect?: Effect | null, isSecondary?: boolean, isSelf?: boolean): boolean | 0 | null;
    spreadDamage(damage: SpreadMoveDamage, targetArray?: (false | Pokemon | null)[] | null, source?: Pokemon | null, effect?: 'drain' | 'recoil' | Effect | null, instafaint?: boolean): (number | false | undefined)[];
    damage(damage: number, target?: Pokemon | null, source?: Pokemon | null, effect?: 'drain' | 'recoil' | Effect | null, instafaint?: boolean): number | false | undefined;
    directDamage(damage: number, target?: Pokemon, source?: Pokemon | null, effect?: Effect | null): number;
    heal(damage: number, target?: Pokemon, source?: Pokemon | null, effect?: 'drain' | Effect | null): number | false;
    chain(previousMod: number | number[], nextMod: number | number[]): number;
    chainModify(numerator: number | number[], denominator?: number): void;
    modify(value: number, numerator: number | number[], denominator?: number): number;
    /** Given a table of base stats and a pokemon set, return the actual stats. */
    spreadModify(baseStats: StatsTable, set: PokemonSet): StatsTable;
    natureModify(stats: StatsTable, set: PokemonSet): StatsTable;
    finalModify(relayVar: number): number;
    getCategory(move: string | Move): Move['category'];
    randomizer(baseDamage: number): number;
    /**
     * Returns whether a proposed target for a move is valid.
     */
    validTargetLoc(targetLoc: number, source: Pokemon, targetType: string): boolean;
    validTarget(target: Pokemon, source: Pokemon, targetType: string): boolean;
    getTarget(pokemon: Pokemon, move: string | Move, targetLoc: number, originalTarget?: Pokemon): Pokemon | null;
    getRandomTarget(pokemon: Pokemon, move: string | Move): Pokemon | null;
    checkFainted(): void;
    faintMessages(lastFirst?: boolean, forceCheck?: boolean, checkWin?: boolean): boolean | undefined;
    checkWin(faintData?: Battle['faintQueue'][0]): true | undefined;
    getActionSpeed(action: AnyObject): void;
    runAction(action: Action): boolean | undefined;
    go(): void;
    /**
     * Takes a choice string passed from the client. Starts the next
     * turn if all required choices have been made.
     */
    choose(sideid: SideID, input: string): boolean;
    /**
     * Convenience method for easily making choices.
     */
    makeChoices(...inputs: string[]): void;
    commitDecisions(): void;
    undoChoice(sideid: SideID): void;
    /**
     * returns true if both decisions are complete
     */
    allChoicesDone(): boolean;
    hint(hint: string, once?: boolean, side?: Side): void;
    addSplit(side: SideID, secret: Part[], shared?: Part[]): void;
    add(...parts: (Part | (() => {
        side: SideID;
        secret: string;
        shared: string;
    }))[]): void;
    addMove(...args: (string | number | Function | AnyObject)[]): void;
    attrLastMove(...args: (string | number | Function | AnyObject)[]): void;
    retargetLastMove(newTarget: Pokemon): void;
    debug(activity: string): void;
    static extractUpdateForSide(data: string, side?: SideID | 'spectator' | 'omniscient'): string;
    getDebugLog(): string;
    debugError(activity: string): void;
    getTeam(options: PlayerOptions): PokemonSet[];
    setPlayer(slot: SideID, options: PlayerOptions): void;
    /** @deprecated */
    join(slot: SideID, name: string, avatar: string, team: PokemonSet[] | string | null): Side;
    sendUpdates(): void;
    getSide(sideid: SideID): Side;
    destroy(): void;
}
export {};
