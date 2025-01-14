const mongoose = require('mongoose');
const config = require('../config/config.json');

const PromptSchema = new mongoose.Schema({
    ChannelID: Number,
    PromptType: String,
    UserID: {
        User1ID: String,
        User2ID: String
    },
    Recycle: {
        Pokemons: Array
    },
    Release: {
        Pokemons: Array
    },
    List: {
        PokemonUID: String,
        Price: Number,
        MarketID: Number,
        AuctionID: Number,
        AuctionPrice: Number,
        BidTime: String,
        ListingFees: Number
    },
    Trade: {
        Accepted: Boolean,
        User1Items: Array,
        User2Items: Array,
        User1IConfirm: Boolean,
        User2IConfirm: Boolean,
        Credits: {
            User1: Number,
            User2: Number
        },
        Redeems: {
            User1: Number,
            User2: Number
        },
        Shards: {
            User1: Number,
            User2: Number
        },
        MessageID: String
    },
    Duel: {
        Accepted: Boolean,
        Turn: Number,
        TM_Allowed: Boolean,
        User1name: String,
        User2name: String,
        ImageCache: String,
        User1Move: Array,
        User1Pokemon: {
            DuelDM: Boolean,
            PokemonUserID: String,
            PokemonName: String,
            PokemonXP: Number,
            PokemonID: String,
            PokemonLevel: Number,
            Attack: Number,
            Defense: Number,
            SpAttack: Number,
            SpDefense: Number,
            Speed: Number,
            ActiveHP: Number,
            TotalHP: Number,
            Moves: Array,
            Traded: Boolean,
            Shiny: Boolean,
            Held: String
        },
        User2Pokemon: {
            DuelDM: Boolean,
            PokemonUserID: String,
            PokemonName: String,
            PokemonXP: Number,
            PokemonID: String,
            PokemonLevel: Number,
            Attack: Number,
            Defense: Number,
            SpAttack: Number,
            SpDefense: Number,
            Speed: Number,
            ActiveHP: Number,
            TotalHP: Number,
            Moves: Array,
            Traded: Boolean,
            Shiny: Boolean,
            Held: String
        }
    },
    expireAt: {
        type: Date,
        default: Date.now,
        index: { expires: config.PROMPT_EXPIRATION_SECONDS },
    },
});

const MessageModel = module.exports = mongoose.model('prompt', PromptSchema);