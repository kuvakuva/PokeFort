const Discord = require('discord.js'); // For Embedded Message.
const _ = require('lodash');
const fs = require('fs');

// Get moveinfo.
const moveinfo = JSON.parse(fs.readFileSync('./assets/movesinfo.json').toString());

// Models
const prompt_model = require('../models/prompt');
const pokemons_model = require('../models/pokemons');
const user_model = require('../models/user');

// Utils
const battle = require('../utils/battle');
const getPokemons = require('../utils/getPokemon');

module.exports.run = async (bot, message, args, prefix, user_available, pokemons) => {
    if (!user_available) { message.channel.send(`You should have started to use this command! Use ${prefix}start to begin the journey!`); return; }
    if (args.length != 1) { return message.channel.send(`Invalid Syntax. Use ${prefix}help to know how to duel.`); }
    if (isInt(args[0]) == false) { return message.channel.send(`Invalid Syntax. Use ${prefix}help to know how to duel.`); }
    if (args[0] > 4 || args[0] < 1) { return message.channel.send(`Invalid Syntax. Use ${prefix}help to know how to duel.`); }

    prompt_model.findOne({ $and: [{ $or: [{ "UserID.User1ID": message.author.id }, { "UserID.User2ID": message.author.id }] }, { "ChannelID": message.channel.id }, { "Duel.Accepted": true }] }, (err, prompt) => {
        if (err) return console.log(err);
        if (!prompt) return message.channel.send('You are not in a duel!');
        message.delete();
        var duel_data = prompt.Duel;
        var user1_data = duel_data.User1Pokemon;
        var user2_data = duel_data.User2Pokemon;

        // Player 1
        if (prompt.UserID.User1ID == message.author.id) {
            if (duel_data.Turn != 1) return message.channel.send('It is not your turn!');
            var user_1_pokemon = pokemons.filter(it => it["Pokemon Id"] == user1_data.PokemonID)[0];
            var user_2_pokemon = pokemons.filter(it => it["Pokemon Id"] == user2_data.PokemonID)[0];
            var move_used = user1_data.Moves[args[0] - 1].replace(/ /g, "").replace(/[^a-zA-Z ]/g, "").toLowerCase();
            var move_used_info = moveinfo[move_used];
            var pokemon_level = user1_data.PokemonLevel;

            if (move_used_info.category == "Special") var damage = battle.calculate_damage(user_1_pokemon, user1_data.SpAttack, user2_data.SpDefense, pokemon_level, move_used_info, user_2_pokemon);
            else var damage = battle.calculate_damage(user_1_pokemon, user1_data.Attack, user2_data.Defense, pokemon_level, move_used_info, user_2_pokemon);

            prompt.Duel.User2Pokemon.ActiveHP -= damage[0];
            prompt.Duel.User1Move = [damage[0], damage[1], move_used_info.name];
            prompt.Duel.Turn = 2;

            if (user1_data.DuelDM != true) message.author.send("Move chosen!\nWaiting for opponent to pick a move...");

            var usr_embed = new Discord.MessageEmbed();
            usr_embed.setColor(message.guild.me.displayHexColor);
            usr_embed.setTitle(`Battle VS ${duel_data.User1name}`);
            var description = "Pick a move by typing the corresponding command in the channel where you started the duel."
            description += "\n\n";
            description += "Available moves:\n\n"
            description += `${user2_data.Moves[0]} ${prefix}use 1\n\n`;
            description += `${user2_data.Moves[1]} ${prefix}use 2\n\n`;
            description += `${user2_data.Moves[2]} ${prefix}use 3\n\n`;
            description += `${user2_data.Moves[3]} ${prefix}use 4\n\n`;
            usr_embed.setDescription(description);

            var new_prompt = new prompt_model();
            new_prompt = duel_copy(prompt, new_prompt);
            new_prompt.save().then(() => { prompt.remove(); });

            // Send Message
            if (user2_data.DuelDM != true) bot.users.cache.get(prompt.UserID.User2ID).send(usr_embed);
        }

        // Player 2
        if (prompt.UserID.User2ID == message.author.id) {
            if (duel_data.Turn != 2) return message.channel.send('It is not your turn!');
            var user_1_pokemon = pokemons.filter(it => it["Pokemon Id"] == user1_data.PokemonID)[0];
            var user_2_pokemon = pokemons.filter(it => it["Pokemon Id"] == user2_data.PokemonID)[0];
            var move_used = user2_data.Moves[args[0] - 1].replace(/ /g, "").replace(/[^a-zA-Z ]/g, "").toLowerCase();
            var move_used_info = moveinfo[move_used];
            var pokemon_level = user2_data.PokemonLevel;
            var description = "";

            if (move_used_info.category == "Special") var damage = battle.calculate_damage(user_2_pokemon, user2_data.SpAttack, user1_data.SpDefense, pokemon_level, move_used_info, user_1_pokemon);
            else var damage = battle.calculate_damage(user_2_pokemon, user2_data.Attack, user1_data.Defense, pokemon_level, move_used_info, user_1_pokemon);

            prompt.Duel.User1Pokemon.ActiveHP -= damage[0];

            // Create embed for damage.
            var embed = new Discord.MessageEmbed()
            embed.setTitle(`${duel_data.User1name} VS ${duel_data.User2name}`)
            embed.setColor(message.guild.me.displayHexColor);

            if (prompt.Duel.User1Pokemon.ActiveHP <= 0 && prompt.Duel.User2Pokemon.ActiveHP <= 0) {
                if (prompt.Duel.User1Pokemon.Speed > prompt.Duel.User2Pokemon.Speed) {
                    player1_is_winner();
                }
                else if (prompt.Duel.User1Pokemon.Speed < prompt.Duel.User2Pokemon.Speed) {
                    player2_is_winner();
                }
                else {
                    player1_is_winner();
                }
            }
            else if (prompt.Duel.User2Pokemon.ActiveHP <= 0) {
                player1_is_winner();
            }
            else if (prompt.Duel.User1Pokemon.ActiveHP <= 0) {
                player2_is_winner();
            }
            else {
                if (prompt.Duel.User1Pokemon.Speed >= prompt.Duel.User2Pokemon.Speed) {
                    description = `${duel_data.User1name}'s ${user1_data.PokemonName}: ${prompt.Duel.User1Pokemon.ActiveHP}/${user1_data.TotalHP}HP\n${duel_data.User2name}'s ${user2_data.PokemonName}: ${prompt.Duel.User2Pokemon.ActiveHP}/${user2_data.TotalHP}HP\n`;
                }
                else {
                    description = `${duel_data.User2name}'s ${user2_data.PokemonName}: ${prompt.Duel.User2Pokemon.ActiveHP}/${user2_data.TotalHP}HP\n${duel_data.User1name}'s ${user1_data.PokemonName}: ${prompt.Duel.User1Pokemon.ActiveHP}/${user1_data.TotalHP}HP\n`;
                }
                const img_buffer = new Buffer.from(prompt.Duel.ImageCache, 'base64');
                const image_file = new Discord.MessageAttachment(img_buffer, 'img.jpeg');
                embed.attachFiles(image_file)
                embed.setImage('attachment://img.jpeg')

                if (prompt.Duel.User1Pokemon.Speed >= prompt.Duel.User2Pokemon.Speed) {
                    description += `\n${duel_data.User1name}'s ${user1_data.PokemonName} used ${duel_data.User1Move[2]}!`;
                    description += `\n${duel_data.User1Move[1]} **-${duel_data.User1Move[0]}**\n`;
                    description += `\n${duel_data.User2name}'s ${user2_data.PokemonName} used ${move_used_info.name}!`;
                    description += `\n${damage[1]} **-${damage[0]}**`;
                }
                else {
                    description += `\n${duel_data.User2name}'s ${user2_data.PokemonName} used ${move_used_info.name}!`;
                    description += `\n${damage[1]} **-${damage[0]}**`;
                    description += `\n${duel_data.User1name}'s ${user1_data.PokemonName} used ${duel_data.User1Move[2]}!`;
                    description += `\n${duel_data.User1Move[1]} **-${duel_data.User1Move[0]}**\n`;
                }
                prompt.Duel.Turn = 1;
                prompt.save();

                if (user2_data.DuelDM != true) message.author.send("Move chosen!\nWaiting for opponent to pick a move...");

                var usr_embed = new Discord.MessageEmbed();
                usr_embed.setColor(message.guild.me.displayHexColor);
                usr_embed.setTitle(`Battle VS ${duel_data.User2name}`);
                var usr_description = "Pick a move by typing the corresponding command in the channel where you started the duel."
                usr_description += "\n\n";
                usr_description += "Available moves:\n\n"
                usr_description += `${user1_data.Moves[0]} ${prefix}use 1\n\n`;
                usr_description += `${user1_data.Moves[1]} ${prefix}use 2\n\n`;
                usr_description += `${user1_data.Moves[2]} ${prefix}use 3\n\n`;
                usr_description += `${user1_data.Moves[3]} ${prefix}use 4\n\n`;
                usr_embed.setDescription(usr_description);

                var new_prompt = new prompt_model();
                new_prompt = duel_copy(prompt, new_prompt);
                new_prompt.save().then(() => { prompt.remove(); });

                // Send Message
                if (user1_data.DuelDM != true) bot.users.cache.get(prompt.UserID.User1ID).send(usr_embed);

            }

            function player1_is_winner() {
                // Xp gained calculations.
                var xp = battle.xp_calculation(user_1_pokemon, user1_data.PokemonLevel, user_2_pokemon, user2_data.PokemonLevel, user1_data.Traded, false);
                // Description generation.
                description += `\n${duel_data.User1name}'s ${user1_data.PokemonName} used ${duel_data.User1Move[2]}!`;
                description += `\n${duel_data.User1Move[1]} **-${duel_data.User1Move[0]}**\n`;
                description += `\n${duel_data.User2name}'s ${user2_data.PokemonName} used ${move_used_info.name}!`;
                description += `\n${damage[1]} **-${damage[0]}**\n`;
                // description += `\n${duel_data.User2name}'s ${user2_data.PokemonName} failed to make a move!\n`;
                description += `\n${duel_data.User2name}'s ${user2_data.PokemonName} has fainted!`;
                description += `**\n${duel_data.User1name} wins!**`;
                if (user1_data.PokemonLevel >= 100) description += `\n${duel_data.User1name}'s Pokemon is in Max Level`;
                else description += `\n${duel_data.User1name} was awarded ${xp}XP`;
                prompt.remove().then(() => {
                    user_model.findOne({ UserID: prompt.UserID.User1ID }).then(user1 => {
                        user1.TotalDueled += 1;
                        user1.DuelWon += 1;

                        // Check for XP Boosters.
                        if (user1.Boosters != undefined) {
                            var old_date = user1.Boosters.Timestamp;
                            var new_date = new Date();
                            var hours = Math.abs(old_date - new_date) / 36e5;
                            if (hours < user1.Boosters.Hours) { xp *= user1.Boosters.Level; }
                        }

                        pokemon_xp_update(user1_data.PokemonUserID, user1_data.PokemonID, parseInt(user1_data.PokemonXP) + parseInt(xp), user1_data.PokemonLevel, user1_data.PokemonName, user1_data.Shiny, user1_data.Held);
                    });
                });
            }

            function player2_is_winner() {
                // Xp gained calculations.
                var xp = battle.xp_calculation(user_2_pokemon, user2_data.PokemonLevel, user_1_pokemon, user1_data.PokemonLevel, user2_data.Traded, false);
                // Description generation.
                description += `\n${duel_data.User1name}'s ${user1_data.PokemonName} used ${duel_data.User1Move[2]}!`;
                description += `\n${duel_data.User1Move[1]} **-${duel_data.User1Move[0]}**\n`;
                // description += `\n${duel_data.User1name}'s ${user1_data.PokemonName} failed to make a move!\n`;
                description += `\n${duel_data.User2name}'s ${user2_data.PokemonName} used ${move_used_info.name}!`;
                description += `\n${damage[1]} **-${damage[0]}**\n`;
                description += `\n${duel_data.User1name}'s ${user1_data.PokemonName} has fainted!`;
                description += `**\n${duel_data.User2name} wins!**`;
                if (user2_data.PokemonLevel >= 100) description += `\n${duel_data.User2name}'s Pokemon is in Max Level`;
                else description += `\n${duel_data.User2name} was awarded ${xp}XP`;
                prompt.remove().then(() => {
                    user_model.findOne({ UserID: prompt.UserID.User1ID }).then(user2 => {
                        user2.TotalDueled += 1;
                        user2.DuelWon += 1;

                        // Check for XP Boosters.
                        if (user2.Boosters != undefined) {
                            var old_date = user2.Boosters.Timestamp;
                            var new_date = new Date();
                            var hours = Math.abs(old_date - new_date) / 36e5;
                            if (hours < user2.Boosters.Hours) { xp *= user2.Boosters.Level; }
                        }

                        pokemon_xp_update(user2_data.PokemonUserID, user2_data.PokemonID, parseInt(user2_data.PokemonXP) + parseInt(xp), user2_data.PokemonLevel, user2_data.PokemonName, user2_data.Shiny, user2_data.Held);
                    });
                });
            }

            embed.setDescription(description);
            message.channel.send(embed);
        }

        //#region Pokemon XP Update.
        function pokemon_xp_update(_id, pokemon_id, pokemon_current_xp, pokemon_level, old_pokemon_name, shiny, held) {
            if (pokemon_level >= 100) return;
            var leveled_up = false;
            var evolved = false;
            var new_evolved_name = "";
            if (held == "Xp blocker") return;
            while (pokemon_current_xp > 0) {
                if (pokemon_current_xp >= exp_to_level(pokemon_level)) {
                    leveled_up = true;

                    //Update level and send message.
                    pokemon_level += 1;
                    pokemon_current_xp -= exp_to_level(pokemon_level);

                    if (pokemon_level == 100) {
                        pokemon_level = 100;
                        pokemon_current_xp = 0;
                        break;
                    }

                    if (held != "Everstone") {
                        // Get pokemon evolution.
                        var pokemon_data = pokemons.filter(it => it["Pokemon Id"] == pokemon_id)[0];
                        //Exections for Tyrogue
                        if (pokemon_id == "360" && pokemon_level >= 20) {
                            var ev = 0;
                            let atk = (_.floor(0.01 * (2 * 35 + selected_pokemon.IV[1] + _.floor(0.25 * ev)) * pokemon_level) + 5);
                            let def = (_.floor(0.01 * (2 * 35 + selected_pokemon.IV[2] + _.floor(0.25 * ev)) * pokemon_level) + 5);

                            if (atk > def) pokemon_id = "140";
                            else if (atk < def) pokemon_id = "141";
                            else pokemon_id = "361";
                            var new_pokemon_name = getPokemons.get_pokemon_name_from_id(pokemon_id, pokemons, selected_pokemon.Shiny);
                            evolved = true;
                            new_evolved_name = new_pokemon_name;

                        }
                        //Exception for Cosmoem
                        else if (pokemon_id == "1320" && pokemon_level >= 53) {
                            if (message.channel.name == "day") { evolved = true; pokemon_id = "1321"; }
                            else if (message.channel.name == "night") { evolved = true; pokemon_id = "1322"; }

                            if (evolved) {
                                var new_pokemon_name = getPokemons.get_pokemon_name_from_id(pokemon_id, pokemons, selected_pokemon.Shiny);
                                new_evolved_name = new_pokemon_name;
                            }
                        }
                        else {
                            if (pokemon_data.Evolution != "NULL" && pokemon_data.Evolution.Reason == "Level") {
                                if (pokemon_level >= pokemon_data.Evolution.Level) {
                                    if (pokemon_data.Evolution.Time == undefined || (pokemon_data.Evolution.Time != undefined && pokemon_data.Evolution.Time.toLowerCase() == message.channel.name.toLowerCase())) {

                                        // Double evolution check.
                                        var double_pokemon_data = pokemons.filter(it => it["Pokemon Id"] == pokemon_data.Evolution.Id)[0];

                                        if ((double_pokemon_data.Evolution != "NULL" && double_pokemon_data.Evolution.Reason == "Level" && pokemon_level >= double_pokemon_data.Evolution.Level) && (double_pokemon_data.Evolution.Time == undefined || (double_pokemon_data.Evolution.Time != undefined && double_pokemon_data.Evolution.Time.toLowerCase() == message.channel.name.toLowerCase()))) {
                                            var new_pokemon_name = getPokemons.get_pokemon_name_from_id(double_pokemon_data.Evolution.Id, pokemons, shiny);
                                            pokemon_id = double_pokemon_data.Evolution.Id;
                                        }
                                        else {
                                            var new_pokemon_name = getPokemons.get_pokemon_name_from_id(pokemon_data.Evolution.Id, pokemons, shiny);
                                            pokemon_id = pokemon_data.Evolution.Id;
                                        }
                                        evolved = true;
                                        new_evolved_name = new_pokemon_name;
                                    }
                                }
                            }
                        }
                    }
                }
                else {
                    break;
                }
            }

            // Update database
            pokemons_model.findOneAndUpdate({ 'Pokemons._id': _id }, { $set: { "Pokemons.$[elem].Experience": pokemon_current_xp, "Pokemons.$[elem].Level": pokemon_level, "Pokemons.$[elem].PokemonId": pokemon_id } }, { arrayFilters: [{ 'elem._id': _id }], new: true }, (err, pokemon) => {
                if (err) return console.log(err);
            });

            // Send Update Note
            var embed = new Discord.MessageEmbed()
            if (evolved) { embed.addField(`**${old_pokemon_name} evolved to ${new_evolved_name}!**`, `${new_evolved_name} is now level ${pokemon_level}`, false); }
            else if (leveled_up) { embed.addField(`**${old_pokemon_name} levelled up!**`, `${old_pokemon_name} is now level ${pokemon_level}`, false); }
            embed.setColor(message.member.displayHexColor)
            if (evolved || leveled_up) message.channel.send(embed);

        }
        //#endregion
    });
}

// Copy duel data to new duel prompt.
function duel_copy(old_prompt, new_prompt) {
    for (var prop in old_prompt._doc) {
        if (old_prompt._doc.hasOwnProperty(prop)) {
            if (prop == "_id" || prop == "expireAt" || prop == "_v") continue;
            new_prompt._doc[prop] = old_prompt._doc[prop];
        }
    }
    return new_prompt;
}

// Exp to level up.
function exp_to_level(level) {
    return 275 + (parseInt(level) * 25) - 25;
}

// Check if value is int.
function isInt(value) {
    var x;
    if (isNaN(value)) {
        return false;
    }
    x = parseFloat(value);
    return (x | 0) === x;
}

module.exports.config = {
    name: "use",
    aliases: []
}
