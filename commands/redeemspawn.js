const Discord = require('discord.js'); // For Embedded Message.

// Models
const channel_model = require('../models/channel');
const user_model = require('../models/user');

module.exports.run = async (bot, message, args, prefix, user_available, pokemons) => {
    if (!user_available) { message.channel.send(`You should have started to use this command! Use ${prefix}start to begin the journey!`); return; }

    await user_model.findOne({ UserID: message.author.id }, (err, user) => {
        if (user) {
            var redeems = user.Redeems == undefined ? 0 : user.Redeems;
            if (redeems >= 1) {
                give_pokemon(bot, message, args, prefix, user_available, pokemons, user)
            }
            else {
                message.channel.send(`You don't have any redeems!`);
            }
        }
    });
}

// Function to give the user a pokemon.
function give_pokemon(bot, message, args, prefix, user_available, pokemons, user) {

    // Pokemon Level
    let level = getRandomInt(1, 36);

    // Forms
    var form = "";
    if (args[0] == undefined) { message.channel.send("That is not a valid pokemon!"); return; }
    if (args[0].toLowerCase() == "alolan") { form = "Alola"; args.splice(0, 1) }
    else if (args[0].toLowerCase() == "galarian") { form = "Galar"; args.splice(0, 1) }

    let given_name = args.join(" ")._normalize();

    if (form == "") {
        var pokemon = pokemons.filter(it => it["Pokemon Name"]._normalize() === given_name); // Searching in English Name.
        if (pokemon.length == 0) {
            dr_pokemon = pokemons.filter(it => it["dr_name"]._normalize() === given_name); // Searching in Germany Name.
            jp_pokemon = pokemons.filter(it => it["jp_name"].some(x => x._normalize() === given_name)); // Searching in Japanese Name.
            fr_pokemon = pokemons.filter(it => it["fr_name"]._normalize() === given_name); // Searching in French Name.
            if (language_finder(dr_pokemon, jp_pokemon, fr_pokemon) == false) { message.channel.send("That is not a valid pokemon!"); return; };
        }
    }
    else {
        var pokemon = pokemons.filter(it => it["Pokemon Name"]._normalize() === given_name && it["Alternate Form Name"] === form); // Searching in English Name.
        if (pokemon.length == 0) {
            dr_pokemon = pokemons.filter(it => it["dr_name"]._normalize() === given_name && it["Alternate Form Name"] === form); // Searching in Germany Name.
            jp_pokemon = pokemons.filter(it => it["jp_name"].some(x => x._normalize() === given_name) && it["Alternate Form Name"] === form); // Searching in Japanese Name.
            fr_pokemon = pokemons.filter(it => it["fr_name"]._normalize() === given_name && it["Alternate Form Name"] === form); // Searching in French Name.
            if (language_finder(dr_pokemon, jp_pokemon, fr_pokemon) == false) { message.channel.send("That is not a valid pokemon!"); return; };
        }
    }

    function language_finder(dr_pokemon, jp_pokemon, fr_pokemon) {
        if (dr_pokemon.length > 0) { pokemon = dr_pokemon; }
        else if (jp_pokemon.length > 0) { pokemon = jp_pokemon; }
        else if (fr_pokemon.length > 0) { pokemon = fr_pokemon; }
        else { return false; }
    }

    pokemon = pokemon[0];
    spawn_pokemon(message, prefix, pokemon, level, user);

}

// Pokemon choosen System
function spawn_pokemon(message, prefix, spawn_pokemon, pokemon_level, user) {

    // Pokemon Nature
    let random_nature = getRandomInt(1, 26);
    let pokemon_shiny = getRandomInt(1, 1000) > 990 ? true : false;

    // IV creation
    var IV = [];
    while (true) {
        let hp_iv = getRandomInt(0, 32);
        let atk_iv = getRandomInt(0, 32);
        let def_iv = getRandomInt(0, 32);
        let spa_iv = getRandomInt(0, 32);
        let spd_iv = getRandomInt(0, 32);
        let spe_iv = getRandomInt(0, 32);
        let total_iv = (hp_iv + atk_iv + def_iv + spa_iv + spd_iv + spe_iv / 186 * 100).toFixed(2);
        IV = [hp_iv, atk_iv, def_iv, spa_iv, spd_iv, spe_iv];
        if (total_iv > 90 || total_iv < 10) { if (getRandomInt(0, 1000) > 990) { continue; } else { break; } }
        break;
    }

    // Image url
    var str = "" + spawn_pokemon["Pokedex Number"];
    var form = spawn_pokemon["Alternate Form Name"];
    var pad = "000"
    var pokedex_num = pad.substring(0, pad.length - str.length) + str;
    if (form == "" || form == "NULL") { var image_name = pokedex_num + '.png'; }
    else { var image_name = pokedex_num + '-' + form.replace(" ", "-") + '.png'; }
    var image_url = './assets/images/' + image_name;

    // Create embed message
    let embed = new Discord.MessageEmbed();
    embed.attachFiles(image_url)
    embed.setImage('attachment://' + image_name)
    embed.setTitle("A wild pokémon has appeared!")
    embed.setDescription(`Guess the pokémon and type ${prefix}catch <pokémon> to catch it!`)
    embed.setColor("#1cb99a");
    message.channel.send(embed);

    // Updating pokemon to database.
    channel_model.findOneAndUpdate({ ChannelID: message.channel.id }, { PokemonID: spawn_pokemon["Pokemon Id"], PokemonLevel: pokemon_level, Shiny: pokemon_shiny, Hint: 0, PokemonNature: random_nature, PokemonIV: IV, MessageCount: 0 }, function (err, channel) {
        if (err) { console.log(err) }
        user.Redeems -= 1;
        user.save();
    });

}

// Random Value
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

// Word search normalizer.
String.prototype._normalize = function () {
    return this.valueOf().normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

module.exports.config = {
    name: "redeemspawn",
    aliases: []
}