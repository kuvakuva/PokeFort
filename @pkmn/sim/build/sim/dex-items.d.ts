import { AnyObject, Battle, CommonHandlers, ConditionData, ID, ModdedDex, Pokemon, SparseBoostsTable } from './exported-global-types';
import { PokemonEventMethods } from './dex-conditions';
import { BasicEffect } from './dex-data';
interface FlingData {
    basePower: number;
    status?: string;
    volatileStatus?: string;
    effect?: CommonHandlers['ResultMove'];
}
export interface ItemData extends Partial<Item>, PokemonEventMethods {
    name: string;
}
export declare type ModdedItemData = ItemData | (Partial<Omit<ItemData, 'name'>> & {
    inherit: true;
    onCustap?: (this: Battle, pokemon: Pokemon) => void;
});
export declare class Item extends BasicEffect implements Readonly<BasicEffect> {
    readonly effectType: 'Item';
    /** just controls location on the item spritesheet */
    readonly num: number;
    /**
     * A Move-like object depicting what happens when Fling is used on
     * this item.
     */
    readonly fling?: FlingData;
    /**
     * If this is a Drive: The type it turns Techno Blast into.
     * undefined, if not a Drive.
     */
    readonly onDrive?: string;
    /**
     * If this is a Memory: The type it turns Multi-Attack into.
     * undefined, if not a Memory.
     */
    readonly onMemory?: string;
    /**
     * If this is a mega stone: The name (e.g. Charizard-Mega-X) of the
     * forme this allows transformation into.
     * undefined, if not a mega stone.
     */
    readonly megaStone?: string;
    /**
     * If this is a mega stone: The name (e.g. Charizard) of the
     * forme this allows transformation from.
     * undefined, if not a mega stone.
     */
    readonly megaEvolves?: string;
    /**
     * If this is a Z crystal: true if the Z Crystal is generic
     * (e.g. Firium Z). If species-specific, the name
     * (e.g. Inferno Overdrive) of the Z Move this crystal allows
     * the use of.
     * undefined, if not a Z crystal.
     */
    readonly zMove?: true | string;
    /**
     * If this is a generic Z crystal: The type (e.g. Fire) of the
     * Z Move this crystal allows the use of (e.g. Fire)
     * undefined, if not a generic Z crystal
     */
    readonly zMoveType?: string;
    /**
     * If this is a species-specific Z crystal: The name
     * (e.g. Play Rough) of the move this crystal requires its
     * holder to know to use its Z move.
     * undefined, if not a species-specific Z crystal
     */
    readonly zMoveFrom?: string;
    /**
     * If this is a species-specific Z crystal: An array of the
     * species of Pokemon that can use this crystal's Z move.
     * Note that these are the full names, e.g. 'Mimikyu-Busted'
     * undefined, if not a species-specific Z crystal
     */
    readonly itemUser?: string[];
    /** Is this item a Berry? */
    readonly isBerry: boolean;
    /** Whether or not this item ignores the Klutz ability. */
    readonly ignoreKlutz: boolean;
    /** The type the holder will change into if it is an Arceus. */
    readonly onPlate?: string;
    /** Is this item a Gem? */
    readonly isGem: boolean;
    /** Is this item a Pokeball? */
    readonly isPokeball: boolean;
    readonly condition?: ConditionData;
    readonly forcedForme?: string;
    readonly isChoice?: boolean;
    readonly naturalGift?: {
        basePower: number;
        type: string;
    };
    readonly spritenum?: number;
    readonly boosts?: SparseBoostsTable | false;
    readonly onEat?: ((this: Battle, pokemon: Pokemon) => void) | false;
    readonly onPrimal?: (this: Battle, pokemon: Pokemon) => void;
    readonly onStart?: (this: Battle, target: Pokemon) => void;
    constructor(data: AnyObject);
}
export declare class DexItems {
    readonly dex: ModdedDex;
    readonly itemCache: Map<ID, Item>;
    allCache: readonly Item[] | null;
    constructor(dex: ModdedDex);
    get(name?: string | Item): Item;
    getByID(id: ID): Item;
    all(): readonly Item[];
}
export {};
