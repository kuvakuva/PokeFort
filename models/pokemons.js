const mongoose = require('mongoose');

const PokemonSchema = new mongoose.Schema({
        UserID: String,
        Pokemons: [{
                PokemonId: String,
                CatchedOn: { type: Number, default: Date.now() },
                Experience: Number,
                Level: Number,
                Nature: Number,
                Moves: { 1: String, 2: String, 3: String, 4: String },
                TmMoves: [],
                IV: [Number, Number, Number, Number, Number, Number],
                EV: [Number, Number, Number, Number, Number, Number],
                Shiny: Boolean,
                Reason: String,
                Nickname: String,
                Favourite: Boolean,
                Held: String,
                Mega: String
        }]
});

const MessageModel = module.exports = mongoose.model('pokemons', PokemonSchema);