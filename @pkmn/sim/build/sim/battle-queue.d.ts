import { Effect, ID, Move, Pokemon } from './exported-global-types';
/**
 * Simulator Battle Action Queue
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * The action queue is the core of the battle simulation. A rough overview of
 * the core battle loop:
 *
 * - chosen moves/switches are added to the action queue
 * - the action queue is sorted in speed/priority order
 * - we go through the action queue
 * - repeat
 *
 * @license MIT
 */
import type { Battle } from './battle';
/** A move action */
export interface MoveAction {
    /** action type */
    choice: 'move' | 'beforeTurnMove' | 'priorityChargeMove';
    order: 3 | 5 | 200 | 201 | 199 | 106;
    /** priority of the action (lower first) */
    priority: number;
    /** fractional priority of the action (lower first) */
    fractionalPriority: number;
    /** speed of pokemon using move (higher first if priority tie) */
    speed: number;
    /** the pokemon doing the move */
    pokemon: Pokemon;
    /** location of the target, relative to pokemon's side */
    targetLoc: number;
    /** original target pokemon, for target-tracking moves */
    originalTarget: Pokemon;
    /** a move to use (move action only) */
    moveid: ID;
    /** a move to use (move action only) */
    move: Move;
    /** true if megaing or ultra bursting */
    mega: boolean | 'done';
    /** if zmoving, the name of the zmove */
    zmove?: string;
    /** if dynamaxed, the name of the max move */
    maxMove?: string;
    /** effect that called the move (eg Instruct) if any */
    sourceEffect?: Effect | null;
}
/** A switch action */
export interface SwitchAction {
    /** action type */
    choice: 'switch' | 'instaswitch';
    order: 3 | 103;
    /** priority of the action (lower first) */
    priority: number;
    /** speed of pokemon switching (higher first if priority tie) */
    speed: number;
    /** the pokemon doing the switch */
    pokemon: Pokemon;
    /** pokemon to switch to */
    target: Pokemon;
    /** effect that called the switch (eg U */
    sourceEffect: Effect | null;
}
/** A Team Preview choice action */
export interface TeamAction {
    /** action type */
    choice: 'team';
    /** priority of the action (lower first) */
    priority: number;
    /** unused for this action type */
    speed: 1;
    /** the pokemon switching */
    pokemon: Pokemon;
    /** new index */
    index: number;
}
/** A generic action not done by a pokemon */
export interface FieldAction {
    /** action type */
    choice: 'start' | 'residual' | 'pass' | 'beforeTurn';
    /** priority of the action (lower first) */
    priority: number;
    /** unused for this action type */
    speed: 1;
    /** unused for this action type */
    pokemon: null;
}
/** A generic action done by a single pokemon */
export interface PokemonAction {
    /** action type */
    choice: 'megaEvo' | 'shift' | 'runPrimal' | 'runSwitch' | 'event' | 'runUnnerve' | 'runDynamax';
    /** priority of the action (lower first) */
    priority: number;
    /** speed of pokemon doing action (higher first if priority tie) */
    speed: number;
    /** the pokemon doing action */
    pokemon: Pokemon;
    /** `runSwitch` only: the pokemon forcing this pokemon to switch in */
    dragger?: Pokemon;
    /** `event` only: the event to run */
    event?: string;
}
export declare type Action = MoveAction | SwitchAction | TeamAction | FieldAction | PokemonAction;
/**
 * An ActionChoice is like an Action and has the same structure, but it doesn't need to be fully filled out.
 *
 * Any Action or ChosenAction qualifies as an ActionChoice.
 *
 * The `[k: string]: any` part is required so TypeScript won't warn about unnecessary properties.
 */
export interface ActionChoice {
    choice: string;
    [k: string]: any;
}
/**
 * Kind of like a priority queue, although not sorted mid-turn in Gen 1-7.
 *
 * Sort order is documented in `BattleQueue.comparePriority`.
 */
export declare class BattleQueue {
    battle: Battle;
    list: Action[];
    constructor(battle: Battle);
    shift(): Action | undefined;
    peek(): Action | undefined;
    push(action: Action): number;
    unshift(action: Action): number;
    [Symbol.iterator](): IterableIterator<Action>;
    entries(): IterableIterator<[number, Action]>;
    /**
     * Takes an ActionChoice, and fills it out into a full Action object.
     *
     * Returns an array of Actions because some ActionChoices (like mega moves)
     * resolve to two Actions (mega evolution + use move)
     */
    resolveAction(action: ActionChoice, midTurn?: boolean): Action[];
    /**
     * Makes the passed action happen next (skipping speed order).
     */
    prioritizeAction(action: MoveAction | SwitchAction, sourceEffect?: Effect): void;
    /**
     * Changes a pokemon's action, and inserts its new action
     * in priority order.
     *
     * You'd normally want the OverrideAction event (which doesn't
     * change priority order).
     */
    changeAction(pokemon: Pokemon, action: ActionChoice): void;
    addChoice(choices: ActionChoice | ActionChoice[]): void;
    willAct(): Action | null;
    willMove(pokemon: Pokemon): MoveAction | null;
    cancelAction(pokemon: Pokemon): boolean;
    cancelMove(pokemon: Pokemon): boolean;
    willSwitch(pokemon: Pokemon): MoveAction | SwitchAction | TeamAction | PokemonAction | null;
    /**
     * Inserts the passed action into the action queue when it normally
     * would have happened (sorting by priority/speed), without
     * re-sorting the existing actions.
     */
    insertChoice(choices: ActionChoice | ActionChoice[], midTurn?: boolean): void;
    clear(): void;
    debug(action?: any): string;
    sort(): this;
}
export default BattleQueue;
