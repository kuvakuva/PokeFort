import { Ability, ActiveMove, AnyObject, Condition, Item, Move, Species } from './exported-global-types';
/**
 * Simulator State
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * Helper functions for serializing Battle instances to JSON and back.
 *
 * (You might also consider using input logs instead.)
 *
 * @license MIT
 */
import { Battle } from './battle';
import { Field } from './field';
import { Pokemon } from './pokemon';
import { Choice, Side } from './side';
declare type Referable = Battle | Field | Side | Pokemon | Condition | Ability | Item | Move | Species;
export declare const State: {
    REFERABLE?: Set<Function> | undefined;
    serializeBattle(battle: Battle): AnyObject;
    deserializeBattle(serialized: string | /* Battle */ AnyObject): Battle;
    normalize(state: AnyObject): AnyObject;
    normalizeLog(log?: null | string | string[]): string | string[] | null | undefined;
    serializeField(field: Field): AnyObject;
    deserializeField(state: AnyObject, field: Field): void;
    serializeSide(side: Side): AnyObject;
    deserializeSide(state: AnyObject, side: Side): void;
    serializePokemon(pokemon: Pokemon): AnyObject;
    deserializePokemon(state: AnyObject, pokemon: Pokemon): void;
    serializeChoice(choice: Choice, battle: Battle): AnyObject;
    deserializeChoice(state: AnyObject, choice: Choice, battle: Battle): void;
    isActiveMove(obj: AnyObject): obj is import("./dex-moves").ActiveMove;
    serializeActiveMove(move: ActiveMove, battle: Battle): AnyObject;
    deserializeActiveMove(state: AnyObject, battle: Battle): ActiveMove;
    serializeWithRefs(obj: unknown, battle: Battle): unknown;
    deserializeWithRefs(obj: unknown, battle: Battle): any;
    isReferable(obj: object): obj is Referable;
    toRef(obj: Referable): string;
    fromRef(ref: string, battle: Battle): Referable | undefined;
    serialize(obj: object, skip: Set<string>, battle: Battle): AnyObject;
    deserialize(state: AnyObject, obj: object, skip: Set<string>, battle: Battle): void;
};
export {};
