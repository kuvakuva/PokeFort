"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChoiceBuilder = void 0;
const common_1 = require("./common");
class ChoiceBuilder {
    constructor(request) {
        this.choices = [];
        // Currently active partial move choice
        this.current = {
            choiceType: 'move',
            move: 0,
            // NOTE: should always be 0 - not partial if `targetLoc` is known
            targetLoc: 0,
            mega: false,
            ultra: false,
            z: false,
            max: false,
        };
        this.alreadySwitchingIn = [];
        this.alreadyMega = false;
        this.alreadyMax = false;
        this.alreadyZ = false;
        this.request = request;
        this.fillPasses();
    }
    fillPasses() {
        const r = this.request;
        switch (r.requestType) {
            case 'move':
                while (this.choices.length < r.active.length && !r.active[this.choices.length]) {
                    this.choices.push('pass');
                }
                break;
            case 'switch':
                while (this.choices.length < r.forceSwitch.length && !r.forceSwitch[this.choices.length]) {
                    this.choices.push('pass');
                }
        }
    }
    isDone() {
        return this.choices.length >= this.requestLength();
    }
    isEmpty() {
        for (const choice of this.choices) {
            if (choice !== 'pass')
                return false;
        }
        return !this.current.move;
    }
    index() {
        return this.choices.length;
    }
    requestLength() {
        switch (this.request.requestType) {
            case 'move':
                return this.request.active.length;
            case 'switch':
                return this.request.forceSwitch.length;
            case 'team':
                if (this.request.maxTeamSize)
                    return this.request.maxTeamSize;
                return 1;
            case 'wait':
                return 0;
        }
    }
    currentMoveRequest() {
        return this.request.requestType === 'move' ? this.request.active[this.index()] : undefined;
    }
    addChoice(choiceString, data) {
        let choice;
        try {
            choice = this.parseChoice(choiceString, data);
        }
        catch (err) {
            return err.message;
        }
        if (!choice)
            return 'The client handles passes for you automatically already';
        if (choice.choiceType === 'move') {
            if (!choice.targetLoc && this.requestLength() > 1) {
                const choosableTargets = ['normal', 'any', 'adjacentAlly', 'adjacentAllyOrSelf', 'adjacentFoe'];
                if (choosableTargets.includes(this.getChosenMove(choice, this.index()).target)) {
                    this.current.move = choice.move;
                    this.current.mega = choice.mega;
                    this.current.ultra = choice.ultra;
                    this.current.z = choice.z;
                    this.current.max = choice.max;
                    return undefined;
                }
            }
            if (choice.mega)
                this.alreadyMega = true;
            if (choice.z)
                this.alreadyZ = true;
            if (choice.max)
                this.alreadyMax = true;
            this.current.move = 0;
            this.current.mega = false;
            this.current.ultra = false;
            this.current.z = false;
            this.current.max = false;
        }
        else if (choice.choiceType === 'switch' || choice.choiceType === 'team') {
            if (this.alreadySwitchingIn.includes(choice.targetPokemon)) {
                if (choice.choiceType === 'switch') {
                    return 'You\'ve already chosen to switch that Pokémon in';
                }
                // remove choice instead
                for (let i = 0; i < this.alreadySwitchingIn.length; i++) {
                    if (this.alreadySwitchingIn[i] === choice.targetPokemon) {
                        this.alreadySwitchingIn.splice(i, 1);
                        this.choices.splice(i, 1);
                        return undefined;
                    }
                }
                return 'Unexpected bug, please report this';
            }
            this.alreadySwitchingIn.push(choice.targetPokemon);
        }
        else if (choice.choiceType === 'shift') {
            if (this.index() === 1) {
                return 'Only Pokémon not already in the center can shift to the center';
            }
        }
        this.choices.push(this.stringChoice(choice));
        this.fillPasses();
        return undefined;
    }
    parseChoice(choice, data) {
        var _a;
        const request = this.request;
        if (request.requestType === 'wait')
            throw new Error('It\'s not your turn to choose anything');
        const index = this.choices.length;
        if (choice === 'shift')
            return { choiceType: 'shift' };
        if (choice.startsWith('move ')) {
            if (request.requestType !== 'move') {
                throw new Error('You must switch in a Pokémon, not move');
            }
            const moveRequest = request.active[index];
            choice = choice.slice(5);
            const current = {
                choiceType: 'move',
                move: 0,
                targetLoc: 0,
                mega: false,
                ultra: false,
                z: false,
                max: false,
            };
            while (true) {
                // If data ends with a number, treat it as a target location.
                // We need to special case 'Conversion 2' so it doesn't get
                // confused with 'Conversion' erroneously sent with the target
                // '2' (since Conversion targets 'self', targetLoc can't be 2).
                if (/\s(?:-|\+)?[1-3]$/.test(choice) && (0, common_1.toID)(choice) !== 'conversion2') {
                    if (current.targetLoc)
                        throw new Error('Move choice has multiple targets');
                    current.targetLoc = parseInt(choice.slice(-2));
                    choice = choice.slice(0, -2).trim();
                }
                else if (choice.endsWith(' mega')) {
                    current.mega = true;
                    choice = choice.slice(0, -5);
                }
                else if (choice.endsWith(' zmove')) {
                    current.z = true;
                    choice = choice.slice(0, -6);
                }
                else if (choice.endsWith(' ultra')) {
                    current.ultra = true;
                    choice = choice.slice(0, -6);
                }
                else if (choice.endsWith(' dynamax')) {
                    current.max = true;
                    choice = choice.slice(0, -8);
                }
                else if (choice.endsWith(' max')) {
                    current.max = true;
                    choice = choice.slice(0, -4);
                }
                else {
                    break;
                }
            }
            if (/^[0-9]+$/.test(choice)) {
                // Parse a one-based move index.
                current.move = parseInt(choice);
            }
            else {
                // Parse a move ID. Move names are also allowed, but may cause ambiguity.
                let moveid = (0, common_1.toID)(choice);
                if (moveid.startsWith('hiddenpower'))
                    moveid = 'hiddenpower';
                for (let i = 0; i < moveRequest.moves.length; i++) {
                    if (moveid === moveRequest.moves[i].id) {
                        current.move = i + 1;
                        break;
                    }
                }
                if (!current.move && moveRequest.zMoves) {
                    for (let i = 0; i < moveRequest.zMoves.length; i++) {
                        if (!moveRequest.zMoves[i])
                            continue;
                        if (moveid === moveRequest.zMoves[i].id) {
                            current.move = i + 1;
                            current.z = true;
                            break;
                        }
                    }
                }
                if (!current.move && moveRequest.maxMoves) {
                    for (let i = 0; i < moveRequest.maxMoves.length; i++) {
                        if (moveid === moveRequest.maxMoves[i].id) {
                            current.move = i + 1;
                            current.max = true;
                            break;
                        }
                    }
                }
            }
            if (current.max && !moveRequest.canDynamax)
                current.max = false;
            return current;
        }
        if (choice.startsWith('switch ') || choice.startsWith('team ')) {
            choice = choice.slice(choice.startsWith('team ') ? 5 : 7);
            const isTeamPreview = request.requestType === 'team';
            const current = {
                choiceType: isTeamPreview ? 'team' : 'switch',
                targetPokemon: 0,
            };
            if (/^[0-9]+$/.test(choice)) {
                // Parse a one-based move index.
                current.targetPokemon = parseInt(choice);
            }
            else {
                // Parse a pokemon name
                const lowerChoice = choice.toLowerCase();
                const choiceid = (0, common_1.toID)(choice);
                let matchLevel = 0;
                let match = 0;
                for (let i = 0; i < request.side.pokemon.length; i++) {
                    const p = request.side.pokemon[i];
                    let curMatchLevel = 0;
                    if (choice === p.name) {
                        curMatchLevel = 10;
                    }
                    else if (lowerChoice === p.name.toLowerCase()) {
                        curMatchLevel = 9;
                    }
                    else if (choiceid === (0, common_1.toID)(p.name)) {
                        curMatchLevel = 8;
                    }
                    else if (choiceid === (0, common_1.toID)(p.speciesForme)) {
                        curMatchLevel = 7;
                    }
                    else if (data && choiceid === (0, common_1.toID)((_a = data.getSpecies(p.speciesForme)) === null || _a === void 0 ? void 0 : _a.baseSpecies)) {
                        curMatchLevel = 6;
                    }
                    if (curMatchLevel > matchLevel) {
                        match = i + 1;
                        matchLevel = curMatchLevel;
                    }
                }
                if (!match)
                    throw new Error(`Couldn't find Pokémon '${choice}' to switch to`);
                current.targetPokemon = match;
            }
            if (!isTeamPreview && current.targetPokemon - 1 < this.requestLength()) {
                throw new Error('That Pokémon is already in battle!');
            }
            const target = request.side.pokemon[current.targetPokemon - 1];
            if (!target)
                throw new Error(`Couldn't find Pokémon '${choice}' to switch to!`);
            if (target.fainted)
                throw new Error(`${target.name} is fainted and cannot battle!`);
            return current;
        }
        if (choice === 'pass')
            return undefined;
        throw new Error(`Unrecognized choice '${choice}'`);
    }
    getChosenMove(choice, pokemonIndex) {
        const request = this.request;
        const activePokemon = request.active[pokemonIndex];
        const moveIndex = choice.move - 1;
        if (choice.z)
            return activePokemon.zMoves[moveIndex];
        if (choice.max || (activePokemon.maxMoves && !activePokemon.canDynamax)) {
            return activePokemon.maxMoves[moveIndex];
        }
        return activePokemon.moves[moveIndex];
    }
    toString() {
        let choices = this.choices;
        if (this.current.move)
            choices = choices.concat(this.stringChoice(this.current));
        return choices.join(', ').replace(/, team /g, ', ');
    }
    stringChoice(choice) {
        if (!choice)
            return 'pass';
        switch (choice.choiceType) {
            case 'move':
                const target = choice.targetLoc ? ` ${choice.targetLoc > 0 ? '+' : ''}${choice.targetLoc}` : '';
                const boost = `${choice.max ? ' max' : ''}${choice.mega ? ' mega' : ''}${choice.z ? ' zmove' : ''}`;
                return `move ${choice.move}${boost}${target}`;
            case 'switch':
            case 'team':
                return `${choice.choiceType} ${choice.targetPokemon}`;
            case 'shift':
                return 'shift';
        }
    }
}
exports.ChoiceBuilder = ChoiceBuilder;
//# sourceMappingURL=choices.js.map