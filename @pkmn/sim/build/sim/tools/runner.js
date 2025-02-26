"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Runner = void 0;
/**
 * Battle Simulator runner.
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * @license MIT
 */
const assert_1 = require("assert");
const fs = __importStar(require("fs"));
const __1 = require("..");
const battle_1 = require("../battle");
const BattleStreams = __importStar(require("../battle-stream"));
const state_1 = require("../state");
const prng_1 = require("../prng");
const random_player_ai_1 = require("./random-player-ai");
class Runner {
    constructor(options) {
        this.format = options.format;
        this.prng = (options.prng && !Array.isArray(options.prng)) ?
            options.prng : new prng_1.PRNG(options.prng);
        this.p1options = { ...Runner.AI_OPTIONS, ...options.p1options };
        this.p2options = { ...Runner.AI_OPTIONS, ...options.p2options };
        this.p3options = { ...Runner.AI_OPTIONS, ...options.p3options };
        this.p4options = { ...Runner.AI_OPTIONS, ...options.p4options };
        this.input = !!options.input;
        this.output = !!options.output;
        this.error = !!options.error;
        this.dual = options.dual || false;
    }
    async run() {
        const battleStream = this.dual ?
            new DualStream(this.input, this.dual === 'debug') :
            new RawBattleStream(this.input);
        const game = this.runGame(this.format, battleStream);
        if (!this.error)
            return game;
        return game.catch(err => {
            console.log(`\n${battleStream.rawInputLog.join('\n')}\n`);
            throw err;
        });
    }
    async runGame(format, battleStream) {
        // @ts-ignore - DualStream implements everything relevant from BattleStream.
        const streams = BattleStreams.getPlayerStreams(battleStream);
        const spec = { formatid: format, seed: this.prng.seed };
        const is4P = __1.Dex.formats.get(format).gameType === 'multi';
        const p1spec = this.getPlayerSpec("Bot 1", this.p1options);
        const p2spec = this.getPlayerSpec("Bot 2", this.p2options);
        let p3spec, p4spec;
        if (is4P) {
            p3spec = this.getPlayerSpec("Bot 3", this.p3options);
            p4spec = this.getPlayerSpec("Bot 4", this.p4options);
        }
        const p1 = this.p1options.createAI(streams.p1, { seed: this.newSeed(), ...this.p1options });
        const p2 = this.p2options.createAI(streams.p2, { seed: this.newSeed(), ...this.p2options });
        let p3, p4;
        if (is4P) {
            p3 = this.p4options.createAI(streams.p3, { seed: this.newSeed(), ...this.p3options });
            p4 = this.p4options.createAI(streams.p4, { seed: this.newSeed(), ...this.p4options });
        }
        // TODO: Use `await Promise.race([streams.omniscient.read(), p1, p2])` to avoid
        // leaving these promises dangling once it no longer causes memory leaks (v8#9069).
        void p1.start();
        void p2.start();
        if (is4P) {
            void p3.start();
            void p4.start();
        }
        let initMessage = `>start ${JSON.stringify(spec)}\n` +
            `>player p1 ${JSON.stringify(p1spec)}\n` +
            `>player p2 ${JSON.stringify(p2spec)}`;
        if (is4P) {
            initMessage += `\n` +
                `>player p3 ${JSON.stringify(p3spec)}\n` +
                `>player p4 ${JSON.stringify(p4spec)}`;
        }
        void streams.omniscient.write(initMessage);
        for await (const chunk of streams.omniscient) {
            if (this.output)
                console.log(chunk);
        }
        return streams.omniscient.writeEnd();
    }
    // Same as PRNG#generatedSeed, only deterministic.
    // NOTE: advances this.prng's seed by 4.
    newSeed() {
        return [
            Math.floor(this.prng.next() * 0x10000),
            Math.floor(this.prng.next() * 0x10000),
            Math.floor(this.prng.next() * 0x10000),
            Math.floor(this.prng.next() * 0x10000),
        ];
    }
    getPlayerSpec(name, options) {
        if (options.team)
            return { name, team: options.team };
        return { name, seed: this.newSeed() };
    }
}
exports.Runner = Runner;
Runner.AI_OPTIONS = {
    createAI: (s, o) => new random_player_ai_1.RandomPlayerAI(s, o),
    move: 0.7,
    mega: 0.6,
};
class RawBattleStream extends BattleStreams.BattleStream {
    constructor(input) {
        super();
        this.input = !!input;
        this.rawInputLog = [];
    }
    _write(message) {
        if (this.input)
            console.log(message);
        this.rawInputLog.push(message);
        super._write(message);
    }
}
class DualStream {
    constructor(input, debug) {
        this.debug = debug;
        // The input to both streams should be the same, so to satisfy the
        // input flag we only need to track the raw input of one stream.
        this.control = new RawBattleStream(input);
        this.test = new RawBattleStream(false);
    }
    get rawInputLog() {
        const control = this.control.rawInputLog;
        const test = this.test.rawInputLog;
        assert_1.strict.deepEqual(test, control);
        return control;
    }
    async read() {
        const control = await this.control.read();
        const test = await this.test.read();
        // In debug mode, wait to catch this as a difference in the inputLog
        // and error there so we get the full battle state dumped instead.
        if (!this.debug)
            assert_1.strict.equal(state_1.State.normalizeLog(test), state_1.State.normalizeLog(control));
        return control;
    }
    write(message) {
        this.control._write(message);
        this.test._write(message);
        this.compare();
    }
    writeEnd() {
        // We need to compare first because _writeEnd() destroys the battle object.
        this.compare(true);
        this.control._writeEnd();
        this.test._writeEnd();
    }
    compare(end) {
        if (!this.control.battle || !this.test.battle)
            return;
        const control = this.control.battle.toJSON();
        const test = this.test.battle.toJSON();
        try {
            assert_1.strict.deepEqual(state_1.State.normalize(test), state_1.State.normalize(control));
        }
        catch (err) {
            if (this.debug) {
                // NOTE: diffing these directly won't work because the key ordering isn't stable.
                fs.writeFileSync('logs/control.json', JSON.stringify(control, null, 2));
                fs.writeFileSync('logs/test.json', JSON.stringify(test, null, 2));
            }
            throw new Error(err.message);
        }
        if (end)
            return;
        const send = this.test.battle.send;
        this.test.battle = battle_1.Battle.fromJSON(test);
        this.test.battle.restart(send);
    }
}
//# sourceMappingURL=runner.js.map