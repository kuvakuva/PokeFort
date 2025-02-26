declare type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};
declare type Battle = import('./battle').Battle;
declare type BattleQueue = import('./battle-queue').BattleQueue;
declare type BattleActions = import('./battle-actions').BattleActions;
declare type Field = import('./field').Field;
declare type Action = import('./battle-queue').Action;
declare type MoveAction = import('./battle-queue').MoveAction;
declare type ActionChoice = import('./battle-queue').ActionChoice;
declare type ModdedDex = import('./dex').ModdedDex;
declare type Pokemon = import('./pokemon').Pokemon;
declare type PRNGSeed = import('./prng').PRNGSeed;
declare type Side = import('./side').Side;
declare type TeamValidator = import('./team-validator').TeamValidator;
declare type PokemonSources = import('./team-validator').PokemonSources;
/** An ID must be lowercase alphanumeric. */
declare type ID = '' | string & {
    __isID: true;
};
declare type PokemonSlot = '' | string & {
    __isSlot: true;
};
interface AnyObject {
    [k: string]: any;
}
declare type GenderName = 'M' | 'F' | 'N' | '';
declare type StatIDExceptHP = 'atk' | 'def' | 'spa' | 'spd' | 'spe';
declare type StatID = 'hp' | StatIDExceptHP;
declare type StatsExceptHPTable = {
    [stat in StatIDExceptHP]: number;
};
declare type StatsTable = {
    [stat in StatID]: number;
};
declare type SparseStatsTable = Partial<StatsTable>;
declare type BoostID = StatIDExceptHP | 'accuracy' | 'evasion';
declare type BoostsTable = {
    [boost in BoostID]: number;
};
declare type SparseBoostsTable = Partial<BoostsTable>;
declare type Nonstandard = 'Past' | 'Future' | 'Unobtainable' | 'CAP' | 'LGPE' | 'Custom' | 'Gigantamax';
declare type PokemonSet = import('./teams').PokemonSet;
/**
 * Describes a possible way to get a move onto a pokemon.
 *
 * First character is a generation number, 1-7.
 * Second character is a source ID, one of:
 *
 * - M = TM/HM
 * - T = tutor
 * - L = start or level-up, 3rd char+ is the level
 * - R = restricted (special moves like Rotom moves)
 * - E = egg
 * - D = Dream World, only 5D is valid
 * - S = event, 3rd char+ is the index in .eventData
 * - V = Virtual Console or Let's Go transfer, only 7V/8V is valid
 * - C = NOT A REAL SOURCE, see note, only 3C/4C is valid
 *
 * C marks certain moves learned by a pokemon's prevo. It's used to
 * work around the chainbreeding checker's shortcuts for performance;
 * it lets the pokemon be a valid father for teaching the move, but
 * is otherwise ignored by the learnset checker (which will actually
 * check prevos for compatibility).
 */
declare type MoveSource = string;
declare namespace TierTypes {
    type Singles = "AG" | "Uber" | "(Uber)" | "OU" | "(OU)" | "UUBL" | "UU" | "RUBL" | "RU" | "NUBL" | "NU" | "(NU)" | "PUBL" | "PU" | "(PU)" | "NFE" | "LC";
    type Doubles = "DUber" | "(DUber)" | "DOU" | "(DOU)" | "DBL" | "DUU" | "(DUU)" | "NFE" | "LC";
    type Other = "Unreleased" | "Illegal" | "CAP" | "CAP NFE" | "CAP LC";
}
interface EventInfo {
    generation: number;
    level?: number;
    /** true: always shiny, 1: sometimes shiny, false | undefined: never shiny */
    shiny?: boolean | 1;
    gender?: GenderName;
    nature?: string;
    ivs?: SparseStatsTable;
    perfectIVs?: number;
    /** true: has hidden ability, false | undefined: never has hidden ability */
    isHidden?: boolean;
    abilities?: string[];
    maxEggMoves?: number;
    moves?: string[];
    pokeball?: string;
    from?: string;
    /** Japan-only events can't be transferred to international games in Gen 1 */
    japan?: boolean;
}
declare type Effect = Ability | Item | ActiveMove | Species | Condition | Format;
interface CommonHandlers {
    ModifierEffect: (this: Battle, relayVar: number, target: Pokemon, source: Pokemon, effect: Effect) => number | void;
    ModifierMove: (this: Battle, relayVar: number, target: Pokemon, source: Pokemon, move: ActiveMove) => number | void;
    ResultMove: boolean | ((this: Battle, target: Pokemon, source: Pokemon, move: ActiveMove) => boolean | null | "" | void);
    ExtResultMove: boolean | ((this: Battle, target: Pokemon, source: Pokemon, move: ActiveMove) => boolean | null | number | "" | void);
    VoidEffect: (this: Battle, target: Pokemon, source: Pokemon, effect: Effect) => void;
    VoidMove: (this: Battle, target: Pokemon, source: Pokemon, move: ActiveMove) => void;
    ModifierSourceEffect: (this: Battle, relayVar: number, source: Pokemon, target: Pokemon, effect: Effect) => number | void;
    ModifierSourceMove: (this: Battle, relayVar: number, source: Pokemon, target: Pokemon, move: ActiveMove) => number | void;
    ResultSourceMove: boolean | ((this: Battle, source: Pokemon, target: Pokemon, move: ActiveMove) => boolean | null | "" | void);
    ExtResultSourceMove: boolean | ((this: Battle, source: Pokemon, target: Pokemon, move: ActiveMove) => boolean | null | number | "" | void);
    VoidSourceEffect: (this: Battle, source: Pokemon, target: Pokemon, effect: Effect) => void;
    VoidSourceMove: (this: Battle, source: Pokemon, target: Pokemon, move: ActiveMove) => void;
}
interface EffectData {
    name?: string;
    desc?: string;
    duration?: number;
    durationCallback?: (this: Battle, target: Pokemon, source: Pokemon, effect: Effect | null) => number;
    effectType?: string;
    infiltrates?: boolean;
    isNonstandard?: Nonstandard | null;
    shortDesc?: string;
}
declare type ModdedEffectData = EffectData | Partial<EffectData> & {
    inherit: true;
};
declare type EffectType = 'Condition' | 'Pokemon' | 'Move' | 'Item' | 'Ability' | 'Format' | 'Nature' | 'Ruleset' | 'Weather' | 'Status' | 'Rule' | 'ValidatorRule';
interface BasicEffect extends EffectData {
    id: ID;
    effectType: EffectType;
    exists: boolean;
    fullname: string;
    gen: number;
    sourceEffect: string;
    toString: () => string;
}
declare type ConditionData = import('./dex-conditions').ConditionData;
declare type ModdedConditionData = import('./dex-conditions').ModdedConditionData;
declare type Condition = import('./dex-conditions').Condition;
declare type MoveData = import('./dex-moves').MoveData;
declare type ModdedMoveData = import('./dex-moves').ModdedMoveData;
declare type ActiveMove = import('./dex-moves').ActiveMove;
declare type Move = import('./dex-moves').Move;
declare type MoveTarget = import('./dex-moves').MoveTarget;
declare type ItemData = import('./dex-items').ItemData;
declare type ModdedItemData = import('./dex-items').ModdedItemData;
declare type Item = import('./dex-items').Item;
declare type AbilityData = import('./dex-abilities').AbilityData;
declare type ModdedAbilityData = import('./dex-abilities').ModdedAbilityData;
declare type Ability = import('./dex-abilities').Ability;
declare type SpeciesData = import('./dex-species').SpeciesData;
declare type ModdedSpeciesData = import('./dex-species').ModdedSpeciesData;
declare type SpeciesFormatsData = import('./dex-species').SpeciesFormatsData;
declare type ModdedSpeciesFormatsData = import('./dex-species').ModdedSpeciesFormatsData;
declare type LearnsetData = import('./dex-species').LearnsetData;
declare type ModdedLearnsetData = import('./dex-species').ModdedLearnsetData;
declare type Species = import('./dex-species').Species;
declare type FormatData = import('./dex-formats').FormatData;
declare type FormatList = import('./dex-formats').FormatList;
declare type ModdedFormatData = import('./dex-formats').ModdedFormatData;
declare type Format = import('./dex-formats').Format;
interface NatureData {
    name: string;
    plus?: StatIDExceptHP;
    minus?: StatIDExceptHP;
}
declare type ModdedNatureData = NatureData | Partial<Omit<NatureData, 'name'>> & {
    inherit: true;
};
declare type Nature = import('./dex-data').Nature;
declare type GameType = 'singles' | 'doubles' | 'triples' | 'rotation' | 'multi' | 'freeforall';
declare type SideID = 'p1' | 'p2' | 'p3' | 'p4';
interface GameTimerSettings {
    dcTimer: boolean;
    dcTimerBank: boolean;
    starting: number;
    grace: number;
    addPerTurn: number;
    maxPerTurn: number;
    maxFirstTurn: number;
    timeoutAutoChoose: boolean;
    accelerate: boolean;
}
declare type SpreadMoveTargets = (Pokemon | false | null)[];
declare type SpreadMoveDamage = (number | boolean | undefined)[];
declare type ZMoveOptions = ({
    move: string;
    target: MoveTarget;
} | null)[];
interface DynamaxOptions {
    maxMoves: ({
        move: string;
        target: MoveTarget;
        disabled?: boolean;
    })[];
    gigantamax?: string;
}
interface BattleScriptsData {
    gen: number;
}
interface ModdedBattleActions {
    inherit?: true;
    afterMoveSecondaryEvent?: (this: BattleActions, targets: Pokemon[], pokemon: Pokemon, move: ActiveMove) => undefined;
    calcRecoilDamage?: (this: BattleActions, damageDealt: number, move: Move) => number;
    canMegaEvo?: (this: BattleActions, pokemon: Pokemon) => string | undefined | null;
    canUltraBurst?: (this: BattleActions, pokemon: Pokemon) => string | null;
    canZMove?: (this: BattleActions, pokemon: Pokemon) => ZMoveOptions | void;
    canDynamax?: (this: BattleActions, pokemon: Pokemon, skipChecks?: boolean) => DynamaxOptions | void;
    forceSwitch?: (this: BattleActions, damage: SpreadMoveDamage, targets: SpreadMoveTargets, source: Pokemon, move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean, isSelf?: boolean) => SpreadMoveDamage;
    getActiveMaxMove?: (this: BattleActions, move: Move, pokemon: Pokemon) => ActiveMove;
    getActiveZMove?: (this: BattleActions, move: Move, pokemon: Pokemon) => ActiveMove;
    getMaxMove?: (this: BattleActions, move: Move, pokemon: Pokemon) => Move | undefined;
    getSpreadDamage?: (this: BattleActions, damage: SpreadMoveDamage, targets: SpreadMoveTargets, source: Pokemon, move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean, isSelf?: boolean) => SpreadMoveDamage;
    getZMove?: (this: BattleActions, move: Move, pokemon: Pokemon, skipChecks?: boolean) => string | true | undefined;
    hitStepAccuracy?: (this: BattleActions, targets: Pokemon[], pokemon: Pokemon, move: ActiveMove) => boolean[];
    hitStepBreakProtect?: (this: BattleActions, targets: Pokemon[], pokemon: Pokemon, move: ActiveMove) => undefined;
    hitStepMoveHitLoop?: (this: BattleActions, targets: Pokemon[], pokemon: Pokemon, move: ActiveMove) => SpreadMoveDamage;
    hitStepTryImmunity?: (this: BattleActions, targets: Pokemon[], pokemon: Pokemon, move: ActiveMove) => boolean[];
    hitStepStealBoosts?: (this: BattleActions, targets: Pokemon[], pokemon: Pokemon, move: ActiveMove) => undefined;
    hitStepTryHitEvent?: (this: BattleActions, targets: Pokemon[], pokemon: Pokemon, move: ActiveMove) => (boolean | '')[];
    hitStepInvulnerabilityEvent?: (this: BattleActions, targets: Pokemon[], pokemon: Pokemon, move: ActiveMove) => boolean[];
    hitStepTypeImmunity?: (this: BattleActions, targets: Pokemon[], pokemon: Pokemon, move: ActiveMove) => boolean[];
    moveHit?: (this: BattleActions, target: Pokemon | null, pokemon: Pokemon, move: ActiveMove, moveData?: ActiveMove, isSecondary?: boolean, isSelf?: boolean) => number | undefined | false;
    runAction?: (this: BattleActions, action: Action) => void;
    runMegaEvo?: (this: BattleActions, pokemon: Pokemon) => boolean;
    runMove?: (this: BattleActions, moveOrMoveName: Move | string, pokemon: Pokemon, targetLoc: number, sourceEffect?: Effect | null, zMove?: string, externalMove?: boolean, maxMove?: string, originalTarget?: Pokemon) => void;
    runMoveEffects?: (this: BattleActions, damage: SpreadMoveDamage, targets: SpreadMoveTargets, source: Pokemon, move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean, isSelf?: boolean) => SpreadMoveDamage;
    runZPower?: (this: BattleActions, move: ActiveMove, pokemon: Pokemon) => void;
    secondaries?: (this: BattleActions, targets: SpreadMoveTargets, source: Pokemon, move: ActiveMove, moveData: ActiveMove, isSelf?: boolean) => void;
    selfDrops?: (this: BattleActions, targets: SpreadMoveTargets, source: Pokemon, move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean) => void;
    spreadMoveHit?: (this: BattleActions, targets: SpreadMoveTargets, pokemon: Pokemon, move: ActiveMove, moveData?: ActiveMove, isSecondary?: boolean, isSelf?: boolean) => [SpreadMoveDamage, SpreadMoveTargets];
    targetTypeChoices?: (this: BattleActions, targetType: string) => boolean;
    tryMoveHit?: (this: BattleActions, target: Pokemon, pokemon: Pokemon, move: ActiveMove) => number | undefined | false | '';
    tryPrimaryHitEvent?: (this: BattleActions, damage: SpreadMoveDamage, targets: SpreadMoveTargets, pokemon: Pokemon, move: ActiveMove, moveData: ActiveMove, isSecondary?: boolean) => SpreadMoveDamage;
    trySpreadMoveHit?: (this: BattleActions, targets: Pokemon[], pokemon: Pokemon, move: ActiveMove, notActive?: boolean) => boolean;
    useMove?: (this: BattleActions, move: Move, pokemon: Pokemon, target?: Pokemon | null, sourceEffect?: Effect | null, zMove?: string, maxMove?: string) => boolean;
    useMoveInner?: (this: BattleActions, move: Move, pokemon: Pokemon, target?: Pokemon | null, sourceEffect?: Effect | null, zMove?: string, maxMove?: string) => boolean;
    getDamage?: (this: BattleActions, pokemon: Pokemon, target: Pokemon, move: string | number | ActiveMove, suppressMessages: boolean) => number | undefined | null | false;
    modifyDamage?: (this: BattleActions, baseDamage: number, pokemon: Pokemon, target: Pokemon, move: ActiveMove, suppressMessages?: boolean) => void;
    doGetMixedSpecies?: (this: BattleActions, species: Species, deltas: AnyObject) => Species;
    getMegaDeltas?: (this: BattleActions, megaSpecies: Species) => AnyObject;
    getMixedSpecies?: (this: BattleActions, originalName: string, megaName: string) => Species;
}
interface ModdedBattleSide {
    canDynamaxNow?: (this: Side) => boolean;
    getRequestData?: (this: Side, forAlly?: boolean) => {
        name: string;
        id: ID;
        pokemon: AnyObject[];
    };
}
interface ModdedBattlePokemon {
    inherit?: true;
    lostItemForDelibird?: Item | null;
    boostBy?: (this: Pokemon, boost: SparseBoostsTable) => boolean | number;
    clearBoosts?: (this: Pokemon) => void;
    calculateStat?: (this: Pokemon, statName: StatIDExceptHP, boost: number, modifier?: number) => number;
    cureStatus?: (this: Pokemon, silent?: boolean) => boolean;
    formeChange?: (this: Pokemon, speciesId: string | Species, source: Effect, isPermanent?: boolean, message?: string) => boolean;
    getAbility?: (this: Pokemon) => Ability;
    getActionSpeed?: (this: Pokemon) => number;
    getItem?: (this: Pokemon) => Item;
    getMoveRequestData?: (this: Pokemon) => {
        moves: {
            move: string;
            id: ID;
            target?: string;
            disabled?: boolean;
        }[];
        maybeDisabled?: boolean;
        trapped?: boolean;
        maybeTrapped?: boolean;
        canMegaEvo?: boolean;
        canUltraBurst?: boolean;
        canZMove?: ZMoveOptions;
    };
    getStat?: (this: Pokemon, statName: StatIDExceptHP, unboosted?: boolean, unmodified?: boolean, fastReturn?: boolean) => number;
    getWeight?: (this: Pokemon) => number;
    hasAbility?: (this: Pokemon, ability: string | string[]) => boolean;
    hasItem?: (this: Pokemon, item: string | string[]) => boolean;
    isGrounded?: (this: Pokemon, negateImmunity: boolean | undefined) => boolean | null;
    modifyStat?: (this: Pokemon, statName: StatIDExceptHP, modifier: number) => void;
    moveUsed?: (this: Pokemon, move: ActiveMove, targetLoc?: number) => void;
    recalculateStats?: (this: Pokemon) => void;
    runImmunity?: (this: Pokemon, type: string, message?: string | boolean) => boolean;
    setAbility?: (this: Pokemon, ability: string | Ability, source: Pokemon | null, isFromFormeChange: boolean) => string | false;
    setItem?: (this: Pokemon, item: string | Item, source?: Pokemon, effect?: Effect) => boolean;
    setStatus?: (this: Pokemon, status: string | Condition, source: Pokemon | null, sourceEffect: Effect | null, ignoreImmunities: boolean) => boolean;
    takeItem?: (this: Pokemon, source: Pokemon | undefined) => boolean | Item;
    transformInto?: (this: Pokemon, pokemon: Pokemon, effect: Effect | null) => boolean;
    ignoringAbility?: (this: Pokemon) => boolean;
    ignoringItem?: (this: Pokemon) => boolean;
    getLinkedMoves?: (this: Pokemon, ignoreDisabled?: boolean) => string[];
    hasLinkedMove?: (this: Pokemon, moveid: string) => boolean;
}
interface ModdedBattleQueue extends Partial<BattleQueue> {
    resolveAction?: (this: BattleQueue, action: ActionChoice, midTurn?: boolean) => Action[];
}
interface ModdedField extends Partial<Field> {
    suppressingWeather?: (this: Field) => boolean;
}
interface ModdedBattleScriptsData extends Partial<BattleScriptsData> {
    inherit?: string;
    actions?: ModdedBattleActions;
    pokemon?: ModdedBattlePokemon;
    queue?: ModdedBattleQueue;
    field?: ModdedField;
    side?: ModdedBattleSide;
    boost?: (this: Battle, boost: SparseBoostsTable, target: Pokemon, source?: Pokemon | null, effect?: Effect | string | null, isSecondary?: boolean, isSelf?: boolean) => boolean | null | 0;
    debug?: (this: Battle, activity: string) => void;
    getActionSpeed?: (this: Battle, action: AnyObject) => void;
    init?: (this: ModdedDex) => void;
    natureModify?: (this: Battle, stats: StatsTable, set: PokemonSet) => StatsTable;
    nextTurn?: (this: Battle) => void;
    runAction?: (this: Battle, action: Action) => void;
    spreadModify?: (this: Battle, baseStats: StatsTable, set: PokemonSet) => StatsTable;
    suppressingWeather?: (this: Battle) => boolean;
    trunc?: (n: number) => number;
    win?: (this: Battle, side?: SideID | '' | Side | null) => boolean;
    faintMessages?: (this: Battle, lastFirst?: boolean) => boolean | undefined;
    tiebreak?: (this: Battle) => boolean;
}
interface TypeData {
    damageTaken: {
        [attackingTypeNameOrEffectid: string]: number;
    };
    HPdvs?: SparseStatsTable;
    HPivs?: SparseStatsTable;
    isNonstandard?: Nonstandard | null;
}
declare type ModdedTypeData = TypeData | Partial<Omit<TypeData, 'name'>> & {
    inherit: true;
};
declare type TypeInfo = import('./dex-data').TypeInfo;
interface PlayerOptions {
    name?: string;
    avatar?: string;
    rating?: number;
    team?: PokemonSet[] | string | null;
    seed?: PRNGSeed;
}
interface TextObject {
    desc?: string;
    shortDesc?: string;
}
interface Plines {
    activate?: string;
    addItem?: string;
    block?: string;
    boost?: string;
    cant?: string;
    changeAbility?: string;
    damage?: string;
    end?: string;
    heal?: string;
    move?: string;
    start?: string;
    transform?: string;
}
interface TextFile extends TextObject {
    name: string;
    gen1?: ModdedTextObject;
    gen2?: ModdedTextObject;
    gen3?: ModdedTextObject;
    gen4?: ModdedTextObject;
    gen5?: ModdedTextObject;
    gen6?: ModdedTextObject;
    gen7?: ModdedTextObject;
}
interface MovePlines extends Plines {
    alreadyStarted?: string;
    blockSelf?: string;
    clearBoost?: string;
    endFromItem?: string;
    fail?: string;
    failSelect?: string;
    failTooHeavy?: string;
    failWrongForme?: string;
    megaNoItem?: string;
    prepare?: string;
    removeItem?: string;
    startFromItem?: string;
    startFromZEffect?: string;
    switchOut?: string;
    takeItem?: string;
    typeChange?: string;
    upkeep?: string;
}
interface AbilityText extends TextFile, Plines {
    activateNoTarget?: string;
    transformEnd?: string;
}
interface MoveText extends TextFile, MovePlines {
}
interface ItemText extends TextFile, Plines {
}
interface PokedexText extends TextFile {
}
interface DefaultText extends AnyObject {
}
interface ModdedTextObject extends TextObject, Plines {
}
declare namespace RandomTeamsTypes {
    interface TeamDetails {
        megaStone?: number;
        zMove?: number;
        hail?: number;
        rain?: number;
        sand?: number;
        sun?: number;
        stealthRock?: number;
        spikes?: number;
        toxicSpikes?: number;
        stickyWeb?: number;
        rapidSpin?: number;
        defog?: number;
        screens?: number;
        illusion?: number;
        statusCure?: number;
    }
    interface FactoryTeamDetails {
        megaCount?: number;
        zCount?: number;
        forceResult: boolean;
        weather?: string;
        typeCount: {
            [k: string]: number;
        };
        typeComboCount: {
            [k: string]: number;
        };
        baseFormes: {
            [k: string]: number;
        };
        has: {
            [k: string]: number;
        };
        weaknesses: {
            [k: string]: number;
        };
        resistances: {
            [k: string]: number;
        };
        gigantamax?: boolean;
    }
    interface RandomSet {
        name: string;
        species: string;
        gender: string | boolean;
        moves: string[];
        ability: string;
        evs: SparseStatsTable;
        ivs: SparseStatsTable;
        item: string;
        level: number;
        shiny: boolean;
        nature?: string;
        happiness?: number;
        gigantamax?: boolean;
    }
    interface RandomFactorySet {
        name: string;
        species: string;
        gender: string;
        item: string;
        ability: string;
        shiny: boolean;
        level: number;
        happiness: number;
        evs: SparseStatsTable;
        ivs: SparseStatsTable;
        nature: string;
        moves: string[];
        gigantamax?: boolean;
    }
}
