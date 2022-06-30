const Discord = require('discord.js'); // For Embedded Message.
const _ = require('lodash');
const fs = require('fs');
const mergeImages = require('merge-images-v2');
const Canvas = require('canvas');

// Raid Sim
const { BattleStreams, Dex } = require('@pkmn/sim');
const { Protocol } = require('@pkmn/protocol');
const { LogFormatter } = require('@pkmn/view');
const { Battle } = require('@pkmn/client');
const { Generations } = require('@pkmn/data')

// Get moveinfo.
const moveinfo = JSON.parse(fs.readFileSync('./assets/movesinfo.json').toString());

// Models
const prompt_model = require('../models/prompt');
const pokemons_model = require('../models/pokemons');
const user_model = require('../models/user');
const raid_model = require('../models/raids');

// Utils
const battle = require('../utils/battle');
const getPokemons = require('../utils/getPokemon');
const movesparser = require('../utils/moveparser');

module.exports.run = async (bot, message, args, prefix, user_available, pokemons, _switch = false) => {
    if (!user_available) { message.channel.send(`You should have started to use this command! Use ${prefix}start to begin the journey!`); return; }
    if (args.length != 1) { return message.channel.send(`Invalid Syntax. Use ${prefix}help to know how to duel.`); }
    if (isInt(args[0]) == false) { return message.channel.send(`Invalid Syntax. Use ${prefix}help to know how to duel.`); }
    if (_switch == false && (args[0] > 4 || args[0] < 1)) { return message.channel.send(`Invalid Syntax. Use ${prefix}help to know how to duel.`); }
    if (_switch == true && (args[0] > 6 || args[0] < 1)) { return message.channel.send(`Invalid Syntax. Use ${prefix}help to know how to raid.`); }

    prompt_model.findOne({ $and: [{ $or: [{ "UserID.User1ID": message.author.id }, { "UserID.User2ID": message.author.id }] }, { "ChannelID": message.channel.id }, { "Duel.Accepted": true }] }, (err, prompt) => {
        if (err) return console.log(err);
        if (!prompt) {
            // Raid check.
            raid_model.findOne({ $and: [{ Trainers: { $in: message.author.id } }, { Timestamp: { $gt: Date.now() } }, { Started: true }, { CurrentDuel: message.author.id }] }, (err, raid_data) => {
                if (err) { console.log(err); return; }
                if (raid_data) return raid(raid_data, bot, message, args, prefix, user_available, pokemons, _switch);
                else return message.channel.send('You are not in a duel!');
            });
        }
        else {

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
        }
    });

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

}


function raid(raid_data, bot, message, args, prefix, user_available, pokemons, _switch, loop = 0, _default = 0) {
    if (args.length != 1 || !isInt(args[0]) || (_switch && (args[0] > 6 || args[0] < 1)) || (!_switch && (args[0] > 4 || args[0] < 1))) return message.channel.send("Please enter a valid move.");

    // Get all moves of raid pokemon.
    var raid_moveset = movesparser.get_raid_moves_from_id(raid_data.RaidPokemon.ID, pokemons);
    var raid_move = move_thinker(raid_moveset, raid_data.TrainersTeam[raid_data.CurrentPokemon].type[0], raid_data.TrainersTeam[raid_data.CurrentPokemon].type[1]);
    var raidmoves_to_stream = [];
    for (i = 0; i < raid_moveset.length; i++) {
        raidmoves_to_stream.push(raid_moveset[i][0]);
    }
    var move_index = raidmoves_to_stream.indexOf(raid_move) + 1;

    // If over looping
    if (loop > 0) {
        if (loop > 5) return;
        // Get any random move.
        var random_move = raid_moveset[randomNumber(0, raid_moveset.length > 24 ? 24 : raid_moveset.length)];
        move_index = raidmoves_to_stream.indexOf(random_move[0]) + 1;
    }

    //Preparation move for player.
    if (raid_data.PreparationMove != undefined) {
        if (args[0] != raid_data.PreparationMove && raid_data.TrainersTeam[raid_data.CurrentPokemon].fainted != true) return message.channel.send("You can't use that move now.");
        else {
            raid_data.PreparationMove = undefined;
        }
    }

    // Preparation move for raid boss.
    if (raid_data.RaidPokemon.PreparationMove != undefined) {
        move_index = raid_data.RaidPokemon.PreparationMove;
        raid_data.RaidPokemon.PreparationMove = undefined;
    }

    // Fainted move block.
    if (raid_data.TrainersTeam[raid_data.CurrentPokemon].fainted == true && _switch == false) {
        return message.channel.send("Your pokemon is fainted. Use switch to switch pokemon.");
    }

    // Get battle data.
    var _battlestream = new BattleStreams.BattleStream();
    const streams = BattleStreams.getPlayerStreams(_battlestream);

    if (_switch == true) {
        if (raid_data.ChangeOnFainted) {
            if (raid_data.CurrentPokemon == args[0] - 1) return message.channel.send("You can't switch to the same pokemon.");
            raid_data.ChangeOnFainted = false;
            var choosed_pokemon = args[0];
            if (args[0] == 1) {
                choosed_pokemon = raid_data.CurrentPokemon + 1;
            }
            raid_data.CurrentPokemon = args[0] - 1;
            var switch_pokemon = raid_data.TrainersTeam[args[0] - 1];
            if ((switch_pokemon != null || switch_pokemon != undefined || switch_pokemon != {}) && !switch_pokemon.fainted && switch_pokemon.fainted != undefined) {
                var write_data = `${raid_data.Stream}\n>p1 switch ${choosed_pokemon}`;
            } else return message.channel.send("Please enter a valid pokemon to switch.");
        }
        else {
            if (raid_data.CurrentPokemon == args[0] - 1) return message.channel.send("You can't switch to the same pokemon.");
            var choosed_pokemon = args[0];
            if (args[0] == 1) {
                choosed_pokemon = raid_data.CurrentPokemon + 1;
            }
            raid_data.CurrentPokemon = args[0] - 1;
            var switch_pokemon = raid_data.TrainersTeam[args[0] - 1];
            if ((switch_pokemon != null || switch_pokemon != undefined || switch_pokemon != {}) && !switch_pokemon.fainted && switch_pokemon.fainted != undefined) {
                var write_data = `${raid_data.Stream}\n>p1 switch ${choosed_pokemon}\n>p2 ${_default == 1 ? "default" : "move " + move_index}`;
            } else return message.channel.send("Please enter a valid pokemon to switch.");
        }
    } else var write_data = `${raid_data.Stream}\n>p1 move ${args[0]}\n>p2 ${_default == 1 ? "default" : "move " + move_index}`;

    // Parse stream data.
    var first_five = true;
    var parsed_stream = write_data.split("\n");
    var first_five_stream_write = parsed_stream[0] + "\n" + parsed_stream[1] + "\n" + parsed_stream[2] + "\n" + parsed_stream[3] + "\n" + parsed_stream[4];
    void streams.omniscient.write(first_five_stream_write);

    // Raid Boss status changes and implementaion.
    if (raid_data.RaidPokemon.RaidStream != undefined && raid_data.RaidPokemon.RaidStream.raidside != undefined) {

        // Field changes.
        var field = JSON.parse(raid_data.RaidPokemon.RaidStream.field);

        // Weather changes.
        if (field.weather != "") {
            var weather = Dex.conditions.dex.conditions.get(field.weather);
            weather.duration = field.weatherState.duration;
            _battlestream.battle.field.setWeather(weather, _battlestream.battle.sides[0].pokemon[0]);
        }

        // Terrain changes.
        if (field.terrain != "") {
            var terrain = Dex.conditions.dex.conditions.get(field.terrain);
            _battlestream.battle.field.setTerrain(terrain, _battlestream.battle.sides[0].pokemon[0]);
        }

        // Raid Boss status changes.
        var raidside = JSON.parse(raid_data.RaidPokemon.RaidStream.raidside);

        // Hp changes.
        _battlestream.battle.sides[1].pokemon[0].sethp(raidside.hp);

        // Status changes.
        _battlestream.battle.sides[1].pokemon[0].setStatus(raidside.status, _battlestream.battle.sides[0].pokemon[0], _battlestream.battle.sides[1].pokemon[0]);

    }

    var except_first_five_stream_write = parsed_stream.slice(5, parsed_stream.length);
    void streams.omniscient.write(except_first_five_stream_write.join("\n"));

    const battle = new Battle(new Generations(Dex));
    const formatter = new LogFormatter('p1', battle);

    void (async () => {
        for await (var chunk of streams.omniscient) {
            if (first_five) first_five = false;
            else {
                var received_data = chunk;
                received_data = received_data.split('\n');
                if ((received_data[received_data.length - 1] == `|turn|${raid_data.CurrentTurn != undefined ? raid_data.CurrentTurn : 1}` && received_data[received_data.length - 1] != "|upkeep") && _switch == false) return raid(raid_data, bot, message, args, prefix, user_available, pokemons, _switch, loop + 1);
                else {
                    var show_str = [];
                    var next_turn = 0;
                    for (const { args, kwArgs } of Protocol.parse(chunk)) {
                        var formatted = formatter.formatText(args, kwArgs);

                        // Execption
                        if (formatted == "\n") continue;
                        if (formatted.startsWith("\n== Turn")) {
                            next_turn = parseInt(formatted.replace("\n== Turn ", ""));
                            continue;
                        }
                        if (formatted.startsWith("\nGo!")) continue;
                        if (formatted.startsWith("Go!")) continue;
                        if (formatted.startsWith("\n$Player2 sent out")) continue;
                        if (formatted.startsWith("Battle started between")) continue;

                        // Remove opposing.
                        formatted = formatted.replace("The opposing ", "");
                        // Remove newlines.
                        formatted = formatted.replaceAll("\n", "");
                        // Remove asterisks.
                        formatted = formatted.replaceAll("*", "");
                        // Remove brackets.
                        formatted = formatted.replaceAll("(", "").replaceAll(")", "");
                        // Remove _r name.
                        formatted = formatted.replaceAll("_r", "");

                        if (formatted) show_str.push(formatted);
                    }

                    // Get message text to show user.
                    if (raid_data.OldStreamText) show_str.splice(0, raid_data.OldStreamText);
                    raid_data.CurrentTurn = raid_data.CurrentTurn != undefined ? next_turn : 1;
                    raid_data.OldStreamText = raid_data.OldStreamText != undefined ? raid_data.OldStreamText + show_str.length : show_str.length;

                    var _user_pokemon_fainted = false;
                    var _raid_pokemon_fainted = false;

                    if (show_str[0] != undefined && !show_str[0].includes("used")) show_str.splice(0, 1);

                    // Formatting for sending message.
                    var first_user_message = [show_str[0]];
                    show_str.splice(0, 1);
                    for (var i = 0; i < show_str.length; i++) {
                        if (show_str[i].startsWith("  ")) {
                            if (show_str[i].endsWith(":prepare|p1a")) {
                                show_str[i] = show_str[i].replace(":prepare|p1a", "");
                                raid_data.PreparationMove = args[0];
                            }
                            else if (show_str[i].endsWith(":prepare|p2a")) {
                                show_str[i] = show_str[i].replace(":prepare|p2a", "");
                                raid_data.RaidPokemon.PreparationMove = move_index;
                            }
                            first_user_message.push(show_str[i]);
                        }
                        else {
                            show_str.splice(0, i);
                            if (show_str[0].includes("fainted!:p1a:")) {
                                _user_pokemon_fainted = true;
                            }
                            else if (show_str[0].includes("fainted!:p2a:")) {
                                _raid_pokemon_fainted = true;
                            }
                            break;
                        }
                    }

                    var second_user_message = [show_str[0]];
                    show_str.splice(0, 1);
                    for (var i = 0; i < show_str.length; i++) {
                        if (show_str[i].startsWith("  ")) {
                            if (show_str[i].endsWith(":prepare|p1a")) {
                                show_str[i] = show_str[i].replace(":prepare|p1a", "");
                                raid_data.PreparationMove = args[0];
                            } else if (show_str[i].endsWith(":prepare|p2a")) {
                                show_str[i] = show_str[i].replace(":prepare|p2a", "");
                                raid_data.RaidPokemon.PreparationMove = move_index;
                            }
                            second_user_message.push(show_str[i]);
                        }
                        else {
                            show_str.splice(0, i);
                            if (show_str[0].includes("fainted!:p1a:")) {
                                _user_pokemon_fainted = true;
                            }
                            else if (show_str[0].includes("fainted!:p2a:")) {
                                _raid_pokemon_fainted = true;
                            }
                            while (show_str[i] != undefined && show_str[i].startsWith("  ")) {
                                second_user_message.push("\n" + show_str[i]);
                                i++;
                            }
                            break;
                        }
                    }

                    if (first_user_message[0] != undefined && second_user_message[0] != undefined) {

                        // Remove words after fainted!:p1a: in first_user_message
                        if (_user_pokemon_fainted) {
                            // Find index of fainted!:p1a:
                            var fainted_index = first_user_message.findIndex(x => x.includes("fainted!:p1a:"));
                            // Remove every string after fainted!:p1a: in that index.
                            if (fainted_index != -1) first_user_message[fainted_index] = first_user_message[fainted_index].substring(0, first_user_message[fainted_index].indexOf(":p1a:"));
                            // Find index of fainted!:p2a:
                            var fainted_index = first_user_message.findIndex(x => x.includes("fainted!:p2a:"));
                            // Remove every string after fainted!:p2a: in that index.
                            if (fainted_index != -1) first_user_message[fainted_index] = first_user_message[fainted_index].substring(0, first_user_message[fainted_index].indexOf(":p2a:"));
                        }

                        // Remove words after fainted!:p2a: in second_user_message
                        if (_user_pokemon_fainted) {
                            // Find index of fainted!:p1a:
                            var fainted_index = second_user_message.findIndex(x => x.includes("fainted!:p1a:"));
                            // Remove every string after fainted!:p1a: in that index.
                            if (fainted_index != -1) second_user_message[fainted_index] = second_user_message[fainted_index].substring(0, second_user_message[fainted_index].indexOf(":p1a:"));
                            // Find index of fainted!:p2a:
                            var fainted_index = second_user_message.findIndex(x => x.includes("fainted!:p2a:"));
                            // Remove every string after fainted!:p2a: in that index.
                            if (fainted_index != -1) second_user_message[fainted_index] = second_user_message[fainted_index].substring(0, second_user_message[fainted_index].indexOf(":p2a:"));
                        }

                        // Create user pokemon message.
                        var usr_embed = new Discord.MessageEmbed();
                        usr_embed.setTitle(first_user_message[0]);
                        usr_embed.setDescription(first_user_message.slice(1).join(""));
                        message.channel.send(usr_embed);

                        // Create raid boss message.
                        var raid_embed = new Discord.MessageEmbed();
                        raid_embed.setTitle(`${second_user_message[0]}`);
                        raid_embed.setDescription(second_user_message.slice(1).join(""));
                        message.channel.send(raid_embed);

                        // Check if user pokemon fainted.
                        if (_user_pokemon_fainted) user_pokemon_fainted();
                        else if (_raid_pokemon_fainted) raid_boss_fainted();

                    }

                    // Undefined Notification if switch is off.
                    if (_switch == false && (first_user_message[0] == undefined || second_user_message[0] == undefined)) {
                        if (_default == 0) return raid(raid_data, bot, message, args, prefix, user_available, pokemons, _switch, loop, 1);
                        else if (_default == 1) return message.channel.send("Your last move is not acceptable. Please use different move or try again.");
                    }

                    if (_user_pokemon_fainted == false && _raid_pokemon_fainted == false) {

                        var raid_boss_image_data = raid_data.RaidPokemon.Image;
                        var user_image_data = raid_data.TrainersTeam[raid_data.CurrentPokemon].Image;

                        // Background image url.
                        var image_url = "./assets/raid_images/background.jpeg";
                        if (_battlestream.battle.field.weather == "hail") image_url = "./assets/raid_images/background-hail.jpeg";
                        else if (_battlestream.battle.field.weather == "sunny") image_url = "./assets/raid_images/background-sunny.jpeg";
                        else if (_battlestream.battle.field.weather == "rain") image_url = "./assets/raid_images/background-rain.jpeg";
                        else if (_battlestream.battle.field.weather == "sandstorm") image_url = "./assets/raid_images/background-sandstorm.jpeg";

                        // Creating Image for embed.
                        mergeImages([image_url,
                            { src: user_image_data[1], x: 80, y: 180, width: 200, height: 200 }, { src: raid_boss_image_data[1], x: 430, y: 20, width: 360, height: 360 }], {
                            Canvas: Canvas
                        }).then(b64 => {
                            const img_data = b64.split(',')[1];
                            const img_buffer = new Buffer.from(img_data, 'base64');
                            const image_file = new Discord.MessageAttachment(img_buffer, 'img.jpeg');

                            // Sending duel message.
                            var embed = new Discord.MessageEmbed();
                            embed.setTitle(`${message.author.username.toUpperCase()} VS Raid Boss!`);
                            embed.setDescription(`**Weather: ${_battlestream.battle.field.weather == "" ? "Clear Skies" : _.capitalize(_battlestream.battle.field.weather)}**${_battlestream.battle.field.terrain == "" ? "" : "\n**Terrain: " + _.capitalize(_battlestream.battle.field.terrain + "**")}`);
                            embed.addField(`${message.author.username}'s Pokémon`, `${_battlestream.battle.sides[0].pokemon[0].name.replaceAll("_r", "")} | ${_battlestream.battle.sides[0].pokemon[0].hp}/${_battlestream.battle.sides[0].pokemon[0].maxhp}HP`, true);
                            embed.addField(`Raid Boss`, `${raid_data.RaidPokemon.Name.replaceAll("_r", "")} | ${_battlestream.battle.sides[1].pokemon[0].hp}/${_battlestream.battle.sides[1].pokemon[0].maxhp}HP`, true);
                            embed.setColor(message.guild.me.displayHexColor);
                            embed.attachFiles(image_file)
                            embed.setImage('attachment://img.jpeg');
                            embed.setFooter(`Use ${prefix}teaminfo to see the current state of your team as well as what moves your pokemon has available to them!`);
                            message.channel.send(embed);

                            raid_data.RaidPokemon.Health = _battlestream.battle.sides[1].pokemon[0].hp;
                        });
                    }

                    // User Pokemon fainted.
                    function user_pokemon_fainted() {
                        raid_data.TrainersTeam[raid_data.CurrentPokemon].fainted = true;
                        // Check if pokemon exists.
                        var non_fainted_pokemon = raid_data.TrainersTeam.filter(x => (x != null || x != undefined || x != {}) && !x.fainted && x.fainted != undefined);
                        if (non_fainted_pokemon.length > 0) {
                            raid_data.ChangeOnFainted = true;
                            raid_data.markModified('TrainersTeam');

                            var fainted_embed = new Discord.MessageEmbed();
                            fainted_embed.setTitle(`${message.author.username}'s ${raid_data.TrainersTeam[raid_data.CurrentPokemon].name.replaceAll("_r", "")} fainted.`);
                            fainted_embed.setDescription(`${message.author.username}, please do ${prefix}switch <number> to switch your selected pokemon.`);
                            message.channel.send(fainted_embed);
                        } else {
                            // Check if other user exists.
                            raid_data.CompletedDuel.push(message.author.id);

                            // Find a user which has not completed duel.
                            var non_battled_user = raid_data.Trainers.filter(x => !raid_data.CompletedDuel.includes(x) && x != null);
                            if (non_battled_user.length > 0) {
                                raid_data.CurrentDuel = undefined;
                                raid_data.TrainersTeam = undefined;
                                raid_data.OldStreamText = 0;
                                raid_data.CurrentTurn = 0;
                                raid_data.markModified('TrainersTeam');
                                message.channel.send(`${message.author.username} ded. Let the other user play.`);
                            }
                            else {
                                raid_boss_won();
                            }
                        }
                    }

                    // Raid Boss fainted.
                    var _raid_boss_fainted = false;
                    function raid_boss_fainted() {
                        _raid_boss_fainted = true;
                        message.channel.send(`Raid boss fainted. User win.`);
                    }

                    // Raid Boss won.
                    var _raid_boss_won = false;
                    function raid_boss_won() {
                        _raid_boss_won = true;
                        message.channel.send(`Raid boss won and raid is over.`);
                    }

                    if (_raid_boss_fainted == false && _raid_boss_won == false) {

                        // Raid save state.
                        raid_data.Stream = _battlestream.battle.inputLog.join('\n');

                        raid_data.RaidPokemon.RaidStream.field = JSON.stringify(_battlestream.battle.field);
                        var a = _battlestream.battle.sides[1];
                        var save_data_raid_stream = {
                            lastSelectedMove: a.lastSelectedMove,
                            faintedLastTurn: a.faintedLastTurn,
                            faintedThisTurn: a.faintedThisTurn,
                            zMoveUsed: a.zMoveUsed,
                            dynamaxUsed: a.dynamaxUsed,
                            sideConditions: a.sideConditions,
                            slotConditions: a.slotConditions,
                            lastMove: a.lastMove,
                            pokemon: [
                                {
                                    moveSlots: a.pokemon[0].moveSlots,
                                    position: a.pokemon[0].position,
                                    status: a.pokemon[0].status,
                                    statusState: a.pokemon[0].statusState,
                                    volatiles: a.pokemon[0].volatiles,
                                    boosts: a.pokemon[0].boosts,
                                    trapped: a.pokemon[0].trapped,
                                    maybeTrapped: a.pokemon[0].maybeTrapped,
                                    maybeDisabled: a.pokemon[0].maybeDisabled,
                                    illusion: a.pokemon[0].illusion,
                                    transformed: a.pokemon[0].transformed,
                                    types: a.pokemon[0].types,
                                    addedType: a.pokemon[0].addedType,
                                    knownType: a.pokemon[0].knownType,
                                    apparentType: a.pokemon[0].apparentType,
                                    switchFlag: a.pokemon[0].switchFlag,
                                    forceSwitchFlag: a.pokemon[0].forceSwitchFlag,
                                    skipBeforeSwitchOutEventFlag: a.pokemon[0].skipBeforeSwitchOutEventFlag,
                                    draggedIn: a.pokemon[0].draggedIn,
                                    newlySwitched: a.pokemon[0].newlySwitched,
                                    lastMove: a.pokemon[0].lastMove,
                                    lastMoveUsed: a.pokemon[0].lastMoveUsed,
                                    moveThisTurn: a.pokemon[0].moveThisTurn,
                                    statsRaisedThisTurn: a.pokemon[0].statsRaisedThisTurn,
                                    statsLoweredThisTurn: a.pokemon[0].statsLoweredThisTurn,
                                    hurtThisTurn: a.pokemon[0].hurtThisTurn,
                                    lastDamage: a.pokemon[0].lastDamage,
                                    attackedBy: a.pokemon[0].attackedBy,
                                    isActive: a.pokemon[0].isActive,
                                    activeTurns: a.pokemon[0].activeTurns,
                                    activeMoveActions: a.pokemon[0].activeMoveActions,
                                    previouslySwitchedIn: a.pokemon[0].previouslySwitchedIn,
                                    truantTurn: a.pokemon[0].truantTurn,
                                    isStarted: a.pokemon[0].isStarted,
                                    duringMove: a.pokemon[0].duringMove,
                                    weighthg: a.pokemon[0].weighthg,
                                    speed: a.pokemon[0].speed,
                                    abilityOrder: a.pokemon[0].abilityOrder,
                                    canMegaEvo: a.pokemon[0].canMegaEvo,
                                    canUltraBurst: a.pokemon[0].canUltraBurst,
                                    canGigantamax: a.pokemon[0].canGigantamax,
                                    maxhp: a.pokemon[0].maxhp,
                                    baseMaxhp: a.pokemon[0].baseMaxhp,
                                    hp: a.pokemon[0].hp,
                                    moveThisTurnResult: a.pokemon[0].moveThisTurnResult,
                                    lastMoveTargetLoc: a.pokemon[0].lastMoveTargetLoc
                                }]
                        }
                        raid_data.RaidPokemon.RaidStream.raidside = JSON.stringify(save_data_raid_stream);

                        // Save to database.
                        raid_data.RaidPokemon.markModified();
                        raid_data.save();

                    } else if (_raid_boss_fainted == true || _raid_boss_won == true) {
                        raid_data.remove();
                    }
                }
            }
        }
    })();
}

// Move thinker based on type effectiveness.
function move_thinker(available_moves, foe_type1, foe_type2) {
    var move_list = [];
    var non_sorted = [];
    for (var i = 0; i < available_moves.length; i++) {
        var effectiveness = battle.type_calc(available_moves[i][1].toLowerCase(), foe_type1.toLowerCase(), foe_type2.toLowerCase());
        move_list.push([available_moves[i][0], effectiveness]);
        non_sorted.push([available_moves[i][0], effectiveness]);
    }
    move_list.sort((a, b) => b[1] - a[1]);
    if (move_list.length == 0) return 1;
    else {
        // Filter the elements which has highest effectiveness.
        var move_list_filtered = move_list.filter(it => (non_sorted.findIndex(x => x[0] == it[0]) < 25) && it[1] == move_list[0][1]);
        if (move_list_filtered.length == 0) return non_sorted[0][0];
        var move_name = move_list_filtered[randomNumber(0, move_list_filtered.length - 1)][0];
        return move_name;
    }
}

// Random move.
function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
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
