"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rulesets = void 0;
exports.Rulesets = {
    standard: {
        inherit: true,
        ruleset: [
            'Obtainable', 'Team Preview', 'Species Clause', 'Nickname Clause', 'OHKO Clause', 'Moody Clause', 'Evasion Moves Clause', 'Endless Battle Clause', 'HP Percentage Mod', 'Cancel Mod',
        ],
    },
    obtainablemoves: {
        inherit: true,
        banlist: [
            // Shell Smash: Clamperl Gen 5+ level-up
            // Sucker Punch: Huntail Gen 4 tutor
            'Huntail + Shell Smash + Sucker Punch',
        ],
    },
    teampreview: {
        inherit: true,
        onTeamPreview() {
            this.add('clearpoke');
            for (const pokemon of this.getAllPokemon()) {
                const details = pokemon.details.replace(', shiny', '')
                    .replace(/(Arceus|Gourgeist|Pumpkaboo|Xerneas|Silvally|Urshifu)(-[a-zA-Z?-]+)?/g, '$1-*')
                    .replace(/(Zacian|Zamazenta)(?!-Crowned)/g, '$1-*'); // Hacked-in Crowned formes will be revealed
                const item = pokemon.item.includes('mail') ? 'mail' : pokemon.item ? 'item' : '';
                this.add('poke', pokemon.side.id, details, item);
            }
            this.makeRequest('teampreview');
        },
    },
};
//# sourceMappingURL=rulesets.js.map