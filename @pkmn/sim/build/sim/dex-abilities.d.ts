import { AnyObject, Battle, ConditionData, Field, ID, ModdedDex, Pokemon, Side } from './exported-global-types';
import { PokemonEventMethods } from './dex-conditions';
import { BasicEffect } from './dex-data';
interface AbilityEventMethods {
    onCheckShow?: (this: Battle, pokemon: Pokemon) => void;
    onEnd?: (this: Battle, target: Pokemon & Side & Field) => void;
    onPreStart?: (this: Battle, pokemon: Pokemon) => void;
    onStart?: (this: Battle, target: Pokemon) => void;
}
export interface AbilityData extends Partial<Ability>, AbilityEventMethods, PokemonEventMethods {
    name: string;
}
export declare type ModdedAbilityData = AbilityData | Partial<AbilityData> & {
    inherit: true;
};
export declare class Ability extends BasicEffect implements Readonly<BasicEffect> {
    readonly effectType: 'Ability';
    /** Rating from -1 Detrimental to +5 Essential; see `data/abilities.ts` for details. */
    readonly rating: number;
    readonly suppressWeather: boolean;
    readonly condition?: ConditionData;
    readonly isPermanent?: boolean;
    readonly isBreakable?: boolean;
    constructor(data: AnyObject);
}
export declare class DexAbilities {
    readonly dex: ModdedDex;
    readonly abilityCache: Map<ID, Ability>;
    allCache: readonly Ability[] | null;
    constructor(dex: ModdedDex);
    get(name?: string | Ability): Ability;
    getByID(id: ID): Ability;
    all(): readonly Ability[];
}
export {};
