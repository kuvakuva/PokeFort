const Discord = require('discord.js'); // For Embedded Message.
const _ = require('lodash');
const fs = require('fs');
const sharp = require('sharp');

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
const mail = require('../utils/mail');

// Misc
const config = require("../config/config.json");

module.exports.run = async (bot, interaction, user_available, pokemons, _switch = false) => {
    if (!user_available) return interaction.reply({ content: `You should have started to use this command! Use /start to begin the journey!`, ephemeral: true });
    if (_switch == false && (interaction.options.get("move").value > 4 || interaction.options.get("move").value < 1)) return interaction.reply({ content: `Invalid Syntax. Use /help to know how to duel.`, ephemeral: true });
    if (_switch == true && (interaction.options.get("id").value > 6 || interaction.options.get("id").value < 1)) return interaction.reply({ content: `Invalid Syntax. Use /help to know how to raid.`, ephemeral: true });

    prompt_model.findOne({ $and: [{ $or: [{ "UserID.User1ID": interaction.user.id }, { "UserID.User2ID": interaction.user.id }] }, { "ChannelID": interaction.channel.id }, { "Duel.Accepted": true }] }, (err, prompt) => {
        if (err) return console.log(err);
        if (!prompt) {
            // Raid check.
            raid_model.findOne({ $and: [{ Trainers: { $in: interaction.user.id } }, { Timestamp: { $gt: Date.now() } }, { Started: true }, { CurrentDuel: interaction.user.id }] }, (err, raid_data) => {
                if (err) { console.log(err); return; }
                if (raid_data) return raid(raid_data, bot, interaction, user_available, pokemons, _switch);
                else return interaction.reply({ content: 'You are not in a duel!', ephemeral: true });
            });
        }
        else {

            // message.delete();
            var duel_data = prompt.Duel;
            var user1_data = duel_data.User1Pokemon;
            var user2_data = duel_data.User2Pokemon;

            // Player 1
            if (prompt.UserID.User1ID == interaction.user.id) {
                if (duel_data.Turn != 1) return interaction.reply({ content: 'It is not your turn!', ephemeral: true });
                var user_1_pokemon = pokemons.filter(it => it["Pokemon Id"] == user1_data.PokemonID)[0];
                var user_2_pokemon = pokemons.filter(it => it["Pokemon Id"] == user2_data.PokemonID)[0];
                var move_used = user1_data.Moves[interaction.options.get("move").value - 1].replace(/ /g, "").replace(/[^a-zA-Z ]/g, "").toLowerCase();
                var move_used_info = moveinfo[move_used];
                var pokemon_level = user1_data.PokemonLevel;

                if (move_used_info.category == "Special") var damage = battle.calculate_damage(user_1_pokemon, user1_data.SpAttack, user2_data.SpDefense, pokemon_level, move_used_info, user_2_pokemon);
                else var damage = battle.calculate_damage(user_1_pokemon, user1_data.Attack, user2_data.Defense, pokemon_level, move_used_info, user_2_pokemon);

                prompt.Duel.User2Pokemon.ActiveHP -= damage[0];
                prompt.Duel.User1Move = [damage[0], damage[1], move_used_info.name];
                prompt.Duel.Turn = 2;

                if (user1_data.DuelDM != true) interaction.user.send("Move chosen!\nWaiting for opponent to pick a move...");

                var usr_embed = new Discord.EmbedBuilder();
                usr_embed.setColor(interaction.member.displayHexColor);
                usr_embed.setTitle(`Battle VS ${duel_data.User1name}`);
                var description = "Pick a move by typing the corresponding command in the channel where you started the duel."
                description += "\n\n";
                description += "Available moves:\n\n"
                description += `${user2_data.Moves[0]} /use 1\n\n`;
                description += `${user2_data.Moves[1]} /use 2\n\n`;
                description += `${user2_data.Moves[2]} /use 3\n\n`;
                description += `${user2_data.Moves[3]} /use 4\n\n`;
                usr_embed.setDescription(description);

                var new_prompt = new prompt_model();
                new_prompt = duel_copy(prompt, new_prompt);
                new_prompt.save().then(() => { prompt.remove(); });

                // Interaction reply
                interaction.reply({ content: `\`${interaction.user.username}\` had made a move.` });

                // Send Message
                if (user2_data.DuelDM != true) bot.users.cache.get(prompt.UserID.User2ID).send(usr_embed);
            }

            // Player 2
            if (prompt.UserID.User2ID == interaction.user.id) {
                if (duel_data.Turn != 2) return interaction.reply({ content: 'It is not your turn!', ephemeral: true });
                var user_1_pokemon = pokemons.filter(it => it["Pokemon Id"] == user1_data.PokemonID)[0];
                var user_2_pokemon = pokemons.filter(it => it["Pokemon Id"] == user2_data.PokemonID)[0];
                var move_used = user2_data.Moves[interaction.options.get("move").value - 1].replace(/ /g, "").replace(/[^a-zA-Z ]/g, "").toLowerCase();
                var move_used_info = moveinfo[move_used];
                var pokemon_level = user2_data.PokemonLevel;
                var description = "";

                if (move_used_info.category == "Special") var damage = battle.calculate_damage(user_2_pokemon, user2_data.SpAttack, user1_data.SpDefense, pokemon_level, move_used_info, user_1_pokemon);
                else var damage = battle.calculate_damage(user_2_pokemon, user2_data.Attack, user1_data.Defense, pokemon_level, move_used_info, user_1_pokemon);

                prompt.Duel.User1Pokemon.ActiveHP -= damage[0];

                // Interaction reply
                interaction.reply({ content: `\`${interaction.user.username}\` had made a move.` });

                var image_file = null;
                // Create embed for damage.
                var embed = new Discord.EmbedBuilder()
                embed.setTitle(`${duel_data.User1name} VS ${duel_data.User2name}`)
                embed.setColor(interaction.member.displayHexColor);

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
                    image_file = img_buffer;
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

                    if (user2_data.DuelDM != true) interaction.user.send("Move chosen!\nWaiting for opponent to pick a move...");

                    var usr_embed = new Discord.EmbedBuilder();
                    usr_embed.setColor(interaction.member.displayHexColor);
                    usr_embed.setTitle(`Battle VS ${duel_data.User2name}`);
                    var usr_description = "Pick a move by typing the corresponding command in the channel where you started the duel."
                    usr_description += "\n\n";
                    usr_description += "Available moves:\n\n"
                    usr_description += `${user1_data.Moves[0]} /use 1\n\n`;
                    usr_description += `${user1_data.Moves[1]} /use 2\n\n`;
                    usr_description += `${user1_data.Moves[2]} /use 3\n\n`;
                    usr_description += `${user1_data.Moves[3]} /use 4\n\n`;
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
                    if (user1_data.PokemonLevel >= 100) description += `\n${duel_data.User1name}'s Pokémon is in Max Level`;
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
                    if (user2_data.PokemonLevel >= 100) description += `\n${duel_data.User2name}'s Pokémon is in Max Level`;
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
                if (image_file == null) interaction.channel.send({ embeds: [embed] });
                else interaction.channel.send({ embeds: [embed], files: [{ attachment: image_file, name: "img.jpeg" }] });
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
                                if (interaction.channel.name == "day") { evolved = true; pokemon_id = "1321"; }
                                else if (interaction.channel.name == "night") { evolved = true; pokemon_id = "1322"; }

                                if (evolved) {
                                    var new_pokemon_name = getPokemons.get_pokemon_name_from_id(pokemon_id, pokemons, selected_pokemon.Shiny);
                                    new_evolved_name = new_pokemon_name;
                                }
                            }
                            else {
                                if (pokemon_data.Evolution != "NULL" && pokemon_data.Evolution.Reason == "Level") {
                                    if (pokemon_level >= pokemon_data.Evolution.Level) {
                                        if (pokemon_data.Evolution.Time == undefined || (pokemon_data.Evolution.Time != undefined && pokemon_data.Evolution.Time.toLowerCase() == interaction.channel.name.toLowerCase())) {

                                            // Double evolution check.
                                            var double_pokemon_data = pokemons.filter(it => it["Pokemon Id"] == pokemon_data.Evolution.Id)[0];

                                            if ((double_pokemon_data.Evolution != "NULL" && double_pokemon_data.Evolution.Reason == "Level" && pokemon_level >= double_pokemon_data.Evolution.Level) && (double_pokemon_data.Evolution.Time == undefined || (double_pokemon_data.Evolution.Time != undefined && double_pokemon_data.Evolution.Time.toLowerCase() == interaction.channel.name.toLowerCase()))) {
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
                var embed = new Discord.EmbedBuilder()
                if (evolved) { embed.addFields({ name: `**${old_pokemon_name} evolved to ${new_evolved_name}!**`, value: `${new_evolved_name} is now level ${pokemon_level}`, inline: false }); }
                else if (leveled_up) { embed.addFields({ name: `**${old_pokemon_name} levelled up!**`, value: `${old_pokemon_name} is now level ${pokemon_level}`, inline: false }); }
                embed.setColor(interaction.member.displayHexColor)
                if (evolved || leveled_up) interaction.channel.send({ embeds: [embed] });

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

function raid(raid_data, bot, interaction, user_available, pokemons, _switch, _default = false, raid_function_health = 5) {

    // loop protection
    raid_function_health--;
    if (raid_function_health <= 0) { return; }

    if ((_switch && (interaction.options.get("id").value > 6 || interaction.options.get("id").value < 1)) || (!_switch && (interaction.options.get("move").value > 4 || interaction.options.get("move").value < 1))) return interaction.reply({ content: "Please enter a valid move.", ephemeral: true });

    var args = [];
    if (_switch) args = [interaction.options.get("id").value];
    else args = [interaction.options.get("move").value];

    //#region Module Pre Processing

    // Raid boss declaration.
    var _raid_boss_won = false;
    var _raid_boss_fainted = false;

    //Preparation move for player.
    if (raid_data.PreparationMove != undefined) {
        if (args[0] != raid_data.PreparationMove && raid_data.TrainersTeam[raid_data.CurrentPokemon].fainted != true) return interaction.reply({ content: "You can't use that move now.", ephemeral: true });
        else {
            raid_data.PreparationMove = undefined;
        }
    }

    // Fainted move block.
    if (raid_data.TrainersTeam[raid_data.CurrentPokemon].fainted == true && _switch == false) {
        return interaction.reply({ content: "Your pokémon is fainted. Use switch to switch pokemon.", ephemeral: true });
    }

    //#endregion

    // Get battle data.
    var _battlestream = new BattleStreams.BattleStream();
    const streams = BattleStreams.getPlayerStreams(_battlestream);

    if (_switch == true) {
        if (raid_data.ChangeOnFainted) {
            if (raid_data.CurrentPokemon == args[0] - 1) return interaction.reply({ content: "You can't switch to the same pokemon.", ephemeral: true });
            raid_data.ChangeOnFainted = false;
            raid_data.CurrentPokemon = args[0] - 1;
            var switch_pokemon = raid_data.TrainersTeam[args[0] - 1];
            var choosed_pokemon = raid_data.UserStreamPokemons.indexOf(switch_pokemon.name) + 1;
            if ((switch_pokemon != null || switch_pokemon != undefined || switch_pokemon != {}) && switch_pokemon.fainted == false) {
                var write_data = `>p1 switch ${choosed_pokemon}`;
            } else return interaction.reply({ content: "Please enter a valid pokémon to switch.", ephemeral: true });
        }
        else {
            if (raid_data.CurrentPokemon == args[0] - 1) return interaction.reply({ content: "You can't switch to the same pokemon.", ephemeral: true });
            raid_data.CurrentPokemon = args[0] - 1;
            var switch_pokemon = raid_data.TrainersTeam[args[0] - 1];
            var choosed_pokemon = raid_data.UserStreamPokemons.indexOf(switch_pokemon.name) + 1;
            if ((switch_pokemon != null || switch_pokemon != undefined || switch_pokemon != {}) && switch_pokemon.fainted == false) {
                var write_data = `>p1 switch ${choosed_pokemon}\n>p2 default`;
            } else return interaction.reply({ content: "Please enter a valid pokémon to switch.", ephemeral: true });
        }
    } else var write_data = `>p1 move ${args[0]}\n>p2 ${_default ? "default" : "[MOVE INDEX]"}`;

    // If over looping
    if (_default) {
        var write_data = `>p1 move ${args[0]}\n>p2 default`;
    } else if (_switch == false && _default == false) {
        var write_data = `>p1 move ${args[0]}\n>p2 [MOVE INDEX]`;
    }

    // Parse stream data.
    var parsed_stream = raid_data.Stream.split("\n");
    var first_five_stream_write = parsed_stream[0] + "\n" + parsed_stream[1] + "\n" + parsed_stream[2] + "\n" + parsed_stream[3] + "\n" + parsed_stream[4];
    void streams.omniscient.write(first_five_stream_write);

    //#region Module Old Trainer Implementation

    // Raid Boss status changes and implementaion.
    if (raid_data.RaidPokemon.RaidStream != undefined && raid_data.RaidPokemon.RaidStream.raidside != undefined) {

        // Field changes.
        if (raid_data.RaidPokemon.RaidStream.field != undefined) {
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
        }

        if (raid_data.RaidPokemon.RaidStream.raidside != undefined) {

            // Raid Boss status changes.
            var raidside = JSON.parse(raid_data.RaidPokemon.RaidStream.raidside).pokemon[0];

            // Hp changes.
            _battlestream.battle.sides[1].pokemon[0].sethp(raidside.hp);

            // Status changes.
            // if (raidside.status != "") _battlestream.battle.sides[1].pokemon[0].setStatus(raidside.status, _battlestream.battle.sides[0].pokemon[0], _battlestream.battle.sides[1].pokemon[0]);

        }
    }

    //#endregion

    var except_first_five_stream_write = parsed_stream.slice(5, parsed_stream.length);
    var move_index = move_thinker(_battlestream.battle, raid_data.CurrentPokemon);
    write_data = write_data.replace("[MOVE INDEX]", "move " + move_index);
    void streams.omniscient.write(except_first_five_stream_write.join("\n") + "\n" + write_data);

    const battle = new Battle(new Generations(Dex));
    const formatter = new LogFormatter('p1', battle);

    void (async () => {
        var received_data = _battlestream.battle.log;
        if ((_battlestream.battle.turn == (raid_data.CurrentTurn != undefined ? raid_data.CurrentTurn : 1) && received_data[received_data.length - 1] != "|upkeep") && _switch == false && !received_data[received_data.length - 1].startsWith("|win") && !received_data[received_data.length - 2].startsWith("|win")) {
            if (_default == false) return raid(raid_data, bot, interaction, user_available, pokemons, _switch, true, raid_function_health);
            else return;
        }
        else {
            // Reply interaction
            var reply_message = !_switch ? "You have made a move!" : _switch ? "You have switched pokemon!" : "Raid Boss is thinking";
            interaction.reply({ content: reply_message });

            var show_str = [];
            var battle_log = _battlestream.battle.log.filter(function (item, pos, arr) { return pos === 0 || item !== arr[pos - 1]; }).join('\n');
            for (const { args, kwArgs } of Protocol.parse(battle_log)) {
                var formatted = formatter.formatText(args, kwArgs);

                // Execption
                if (formatted == "\n") continue;
                if (formatted.startsWith("\n== Turn") || formatted.startsWith("== Turn")) continue;
                if (formatted.startsWith("\nGo!") || formatted.startsWith("Go!")) continue;
                if (formatted.startsWith("Go!")) continue;
                if (formatted.startsWith("\n$Player2 sent out") || formatted.startsWith("$Player2 sent out")) continue;
                if (formatted.startsWith("Battle started between")) continue;

                // Remove opposing.
                formatted = formatted.replace("The opposing ", "");
                // Remove newlines.
                formatted = formatted.replaceAll("\n", "");
                // Remove asterisks.
                formatted = formatted.replaceAll("*", "");
                // Remove brackets.
                formatted = formatted.replaceAll("(", "").replaceAll(")", "");
                // Remove _r_<index> name.
                if (formatted.includes("_r_")) formatted = formatted = formatted.substring(0, formatted.indexOf("_r_")) + formatted.substring(formatted.indexOf("_r_") + 4);
                // Remove _r.
                formatted = formatted.replaceAll("_r", "");
                // Remove underscores
                formatted = formatted.replaceAll("_", "");

                if (formatted) show_str.push(formatted);
            }

            // Faint check.
            if (_battlestream.battle.p1.faintedThisTurn != undefined ? _battlestream.battle.p1.faintedThisTurn.fainted : false) _user_pokemon_fainted = true;
            if (_battlestream.battle.p2.faintedThisTurn != undefined ? _battlestream.battle.p2.faintedThisTurn.fainted : false) _raid_pokemon_fainted = true;

            // Get message text to show user.
            var old_stream_no = raid_data.OldStreamText;
            raid_data.OldStreamText = show_str.length;
            if (raid_data.OldStreamText) show_str.splice(0, old_stream_no);
            raid_data.CurrentTurn = _battlestream.battle.turn;

            var _user_pokemon_fainted = false;
            var _raid_pokemon_fainted = false;

            if (show_str[0] != undefined && !show_str[0].includes("used")) show_str.splice(0, 1);

            // Formatting for sending message.
            var first_user_message = [show_str[0]];
            show_str.splice(0, 1);
            for (var i = 0; i < show_str.length; i++) {
                if (show_str[i].startsWith("  ")) {
                    first_user_message.push(show_str[i]);
                }
                else {
                    show_str.splice(0, i);
                    if (_battlestream.battle.p1.faintedThisTurn != undefined ? _battlestream.battle.p1.faintedThisTurn.fainted : false) _user_pokemon_fainted = true;
                    if (_battlestream.battle.p2.faintedThisTurn != undefined ? _battlestream.battle.p2.faintedThisTurn.fainted : false) _raid_pokemon_fainted = true;
                    break;
                }
            }

            var second_user_message = [show_str[0]];
            show_str.splice(0, 1);
            for (var i = 0; i < show_str.length; i++) {
                if (_battlestream.battle.p1.faintedThisTurn != undefined ? _battlestream.battle.p1.faintedThisTurn.fainted : false) {
                    _user_pokemon_fainted = true;
                }
                if (_battlestream.battle.p2.faintedThisTurn != undefined ? _battlestream.battle.p2.faintedThisTurn.fainted : false) {
                    _raid_pokemon_fainted = true;
                }
                if (show_str[i].startsWith("  ")) {
                    second_user_message.push(show_str[i]);
                }
            }

            if (first_user_message[0] != undefined && second_user_message[0] != undefined) {

                // Remove duplicate from first_user_message.
                first_user_message = [...new Set(first_user_message)];

                // Remove duplicate from second_user_message.
                second_user_message = [...new Set(second_user_message)];

                // Remove words after fainted!:p1a: in first_user_message
                if (_user_pokemon_fainted || _raid_pokemon_fainted) {
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
                if (_user_pokemon_fainted || _raid_pokemon_fainted) {
                    // Find index of fainted!:p1a:
                    var fainted_index = second_user_message.findIndex(x => x.includes("fainted!:p1a:"));
                    // Remove every string after fainted!:p1a: in that index.
                    if (fainted_index != -1) second_user_message[fainted_index] = second_user_message[fainted_index].substring(0, second_user_message[fainted_index].indexOf(":p1a:"));
                    // Find index of fainted!:p2a:
                    var fainted_index = second_user_message.findIndex(x => x.includes("fainted!:p2a:"));
                    // Remove every string after fainted!:p2a: in that index.
                    if (fainted_index != -1) second_user_message[fainted_index] = second_user_message[fainted_index].substring(0, second_user_message[fainted_index].indexOf(":p2a:"));
                }

                // Remove _ from first_user_message
                for (var r = 0; r < first_user_message.length; r++) {
                    first_user_message[r] = first_user_message[r].replace("_", " ");
                }

                // Remove _ from second_user_message
                for (var r = 0; r < second_user_message.length; r++) {
                    second_user_message[r] = second_user_message[r].replace("_", " ");
                }

                // Filter system message $player
                if (!first_user_message[0].startsWith("$Player")) {
                    // Create user pokemon message.
                    var usr_embed = new Discord.EmbedBuilder();
                    usr_embed.setTitle(first_user_message[0]);
                    var description = first_user_message.slice(1);
                    if (description.length > 0) {
                        usr_embed.setDescription(description.join(""));
                        interaction.channel.send({ embeds: [usr_embed] });
                    }
                }

                if (!second_user_message[0].startsWith("$Player") && _switch != true) {
                    // Create raid boss message.
                    var raid_embed = new Discord.EmbedBuilder();
                    raid_embed.setTitle(`${second_user_message[0]}`);
                    var description = second_user_message.slice(1);
                    if (description.length > 0) {
                        raid_embed.setDescription(description.join(""));
                        interaction.channel.send({ embeds: [raid_embed] });
                    }
                }

                // Check if user pokemon fainted.
                if (_user_pokemon_fainted == true && _raid_pokemon_fainted == true) {
                    _raid_boss_fainted = true;
                    raid_boss_fainted();
                }
                else if (_user_pokemon_fainted == true && _raid_boss_fainted == false) user_pokemon_fainted();
                else if (_raid_pokemon_fainted == true) {
                    _raid_boss_fainted = true;
                    raid_boss_fainted();
                }

            }

            //#region Module Image Generation
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

                // Image 1
                sharp(user_image_data[1]).resize({ width: 200, height: 200 }).toBuffer().then(function (one) {
                    // Image 2
                    sharp(raid_boss_image_data[1]).resize({ width: 360, height: 360 }).toBuffer().then(function (two) {
                        sharp(image_url)
                            .composite([{ input: one, top: 180, left: 80 }, { input: two, top: 20, left: 430 }])
                            .jpeg({ quality: 100 })
                            .toBuffer("jpeg").then((image_buffer) => {
                                // Sending duel message.

                                // Remove words after _r in forms and normal pokemons
                                var battle_stream_pokemon_name = _battlestream.battle.sides[0].pokemon[0].name;
                                var index_of_r = battle_stream_pokemon_name.indexOf("_r");
                                if (index_of_r != -1) battle_stream_pokemon_name = battle_stream_pokemon_name.substring(0, index_of_r);

                                var embed = new Discord.EmbedBuilder();
                                embed.setTitle(`${interaction.user.username.toUpperCase()} VS Raid Boss!`);
                                embed.setDescription(`**Weather: ${_battlestream.battle.field.weather == "" ? "Clear Skies" : _.capitalize(_battlestream.battle.field.weather)}**${_battlestream.battle.field.terrain == "" ? "" : "\n**Terrain: " + _.capitalize(_battlestream.battle.field.terrain.replace("terrain", "") + "**")}`);
                                embed.addFields({ name: `${interaction.user.username}'s Pokémon`, value: `${battle_stream_pokemon_name} | ${_battlestream.battle.sides[0].pokemon[0].hp}/${_battlestream.battle.sides[0].pokemon[0].maxhp}HP`, inline: true });
                                embed.addFields({ name: `Raid Boss`, value: `${raid_data.RaidPokemon.Name.replaceAll("_r", "")} | ${_battlestream.battle.sides[1].pokemon[0].hp}/${_battlestream.battle.sides[1].pokemon[0].maxhp}HP`, inline: true });
                                embed.setColor(interaction.member.displayHexColor);
                                embed.setImage('attachment://img.jpeg');
                                embed.setFooter({ text: `Use /team to see the current state of your team as well as what moves your pokémon has available to them!` });
                                interaction.channel.send({ embeds: [embed], files: [{ attachment: image_buffer, name: "img.jpeg" }] });
                            });
                    });
                });
                raid_data.RaidPokemon.Health = _battlestream.battle.sides[1].pokemon[0].hp;
            }
            //#endregion

            //#region Module Final
            // User Pokemon fainted.
            function user_pokemon_fainted() {
                raid_data.TrainersTeam[raid_data.CurrentPokemon].fainted = true;
                // Check if pokemon exists.
                var non_fainted_pokemon = raid_data.TrainersTeam.filter(x => (x != null || x != undefined || x != {}) && !x.fainted && x.fainted != undefined);
                if (non_fainted_pokemon.length > 0) {
                    raid_data.ChangeOnFainted = true;
                    raid_data.markModified('TrainersTeam');

                    var fainted_embed = new Discord.EmbedBuilder();
                    fainted_embed.setTitle(`${interaction.user.username}'s ${raid_data.TrainersTeam[raid_data.CurrentPokemon].name.replaceAll("_r", "").slice(0, -2)} fainted.`);
                    fainted_embed.setDescription(`${interaction.user.username}, please do /switch <number> to switch your selected pokemon.`);
                    interaction.channel.send({ embeds: [fainted_embed] });
                } else {
                    // Check if other user exists.
                    raid_data.CompletedDuel.push(interaction.user.id);

                    // Find a user which has not completed duel.
                    var non_battled_user = raid_data.Trainers.filter(x => !raid_data.CompletedDuel.includes(x) && x != null);
                    if (non_battled_user.length > 0) {
                        raid_data.CurrentDuel = undefined;
                        raid_data.TrainersTeam = undefined;
                        raid_data.OldStreamText = 0;
                        raid_data.CurrentTurn = 0;
                        raid_data.markModified('TrainersTeam');

                        raid_data.RaidPokemon.RaidStream.field = JSON.stringify(_battlestream.battle.field);
                        var a = _battlestream.battle.sides[1];
                        var save_data_raid_stream = {
                            pokemon: [
                                {
                                    status: a.pokemon[0].status,
                                    statusState: a.pokemon[0].statusState,
                                    volatiles: a.pokemon[0].volatiles,
                                    boosts: a.pokemon[0].boosts,
                                    hp: a.pokemon[0].hp,
                                    maxhp: a.pokemon[0].maxhp
                                }]
                        }
                        raid_data.RaidPokemon.RaidStream.raidside = JSON.stringify(save_data_raid_stream);
                        raid_data.markModified('RaidPokemon');

                        var unable_embed = new Discord.EmbedBuilder();
                        unable_embed.setTitle(`Raid Incomplete!`);
                        unable_embed.setDescription(`${interaction.user.username}, you have no more pokémon to battle. Your duel has ended!`);
                        interaction.channel.send({ embeds: [unable_embed] });
                    }
                    else {
                        _raid_boss_won = true;
                        raid_boss_won();
                    }
                }
            }

            // Funcitont to add damage data
            function damage_addition() {
                // Raid Health and damage
                var current_damage = (raid_data.RaidPokemon.PreviousHealth ? raid_data.RaidPokemon.PreviousHealth : _battlestream.battle.sides[1].pokemon[0].maxhp) - _battlestream.battle.sides[1].pokemon[0].hp;
                if (current_damage > 0) {
                    var raid_usr_damage_data = raid_data.Damages.filter(x => x.UserID == interaction.user.id)[0];
                    if (raid_usr_damage_data) {
                        var index = raid_data.Damages.indexOf(raid_usr_damage_data);
                        raid_data.Damages[index].Damage = raid_usr_damage_data.Damage + current_damage;
                    } else {
                        raid_data.Damages.push({
                            UserID: interaction.user.id,
                            Damage: current_damage
                        });
                    }

                    user_model.findOne({ UserID: interaction.user.id }, (err, user) => {
                        if (err) return;
                        if (user) {
                            user.Raids.TotalDamage = user.Raids.TotalDamage ? user.Raids.TotalDamage + current_damage : current_damage;
                        }
                        user.save();
                    });
                    raid_data.markModified('Damages');
                }
            }

            // Raid Boss fainted.
            function raid_boss_fainted() {
                damage_addition();
                raid_data.remove().then(() => {
                    var channel_embed = new Discord.EmbedBuilder();
                    channel_embed.setTitle(`Congratulations!`);
                    channel_embed.setDescription(`You have defeated the raid boss. Your rewards are sent to your DM.`);
                    channel_embed.setColor(interaction.member.displayHexColor);
                    interaction.channel.send({ embeds: [channel_embed] });
                    function raid_boss_faint_loop(i = 0) {
                        if (raid_data.Trainers[i]) {
                            // Get user data.
                            var user_id = raid_data.Trainers[i];
                            user_model.findOne({ UserID: user_id }, (err, user) => {
                                if (err) raid_boss_faint_loop(i++);
                                if (user) {
                                    var credits, redeems, wishing_piece, raid_boss_reward;
                                    credits = Math.floor(_.random(180, 220) * ((raid_data.RaidType + 1) ** 2));
                                    user.PokeCredits = user.PokeCredits ? user.PokeCredits + credits : credits;

                                    // Reward for winning the raid calculation.
                                    switch (raid_data.RaidType) {
                                        case 0:
                                            if (_.random(1, 1000) > 999) redeems = true;
                                            if (_.random(1, 1000) > 995) wishing_piece = true;
                                            if (_.random(1, 1000) > 997) raid_boss_reward = true;
                                            break;
                                        case 1:
                                            if (_.random(1, 1000) > 999) redeems = true;
                                            if (_.random(1, 100) > 99) wishing_piece = true;
                                            if (_.random(1, 100) > 99) raid_boss_reward = true;
                                            break;
                                        case 2:
                                            if (_.random(1, 1000) > 997) redeems = true;
                                            if (_.random(1, 100) > 95) wishing_piece = true;
                                            if (_.random(1, 100) > 95) raid_boss_reward = true;
                                            break;
                                        case 3:
                                            if (_.random(1, 100) > 99) redeems = true;
                                            if (_.random(1, 100) > 90) wishing_piece = true;
                                            if (_.random(1, 100) > 90) raid_boss_reward = true;
                                            break;
                                        case 4:
                                            if (_.random(1, 100) > 95) redeems = true;
                                            if (_.random(1, 100) > 75) wishing_piece = true;
                                            if (_.random(1, 100) > 75) raid_boss_reward = true;
                                            break;
                                    }

                                    var rewards_string = `**Rewards:**\nCredits: ${credits}`;
                                    if (redeems) {
                                        user.Redeems = user.Redeems ? user.Redeems + 1 : 1;
                                        rewards_string += `\nRedeems: 1`;
                                    }
                                    if (wishing_piece) {
                                        user.WishingPieces = user.WishingPieces ? user.WishingPieces + 1 : 1;
                                        rewards_string += `\nWishing Piece: 1`;
                                    }
                                    if (raid_boss_reward) {
                                        let pokemon_data = {
                                            PokemonId: raid_data.RaidPokemon.ID,
                                            Experience: 0,
                                            Level: 1,
                                            Nature: _.random(1, 25),
                                            IV: [_.random(1, 31), _.random(1, 30), _.random(1, 30), _.random(1, 30), _.random(1, 30), _.random(1, 30)],
                                            Shiny: false,
                                            Reason: "Raid"
                                        }

                                        getPokemons.insertpokemon(user_id, pokemon_data).then(result => { });
                                        rewards_string += `\nLevel 1 ${raid_data.RaidPokemon.Name}`;
                                    }

                                    rewards_string += "\n";

                                    var overview = "**Overview:**";
                                    var sorted_damages = raid_data.Damages.sort((a, b) => Number(b.Damage) - Number(a.Damage));
                                    var final_index_number = 0;
                                    for (var j = 0; j < sorted_damages.length; j++) {
                                        if (raid_data.TrainersTag[raid_data.Trainers.findIndex(x => x == sorted_damages[j].UserID)] != undefined) {
                                            overview += `\n#${j + 1} ${raid_data.TrainersTag[raid_data.Trainers.findIndex(x => x == sorted_damages[j].UserID)].slice(0, -5)} -> Damage: ${sorted_damages[j].Damage.toLocaleString()}`;
                                            if (raid_data.Trainers.findIndex(x => x == sorted_damages[j].UserID) == 0) overview += " :crown:";
                                            final_index_number = j + 1;
                                        }
                                    }

                                    var zero_damage_users = raid_data.Trainers.filter(x => raid_data.Damages.findIndex(y => y.UserID == x) == -1);
                                    for (var j = 0; j < zero_damage_users.length; j++) {
                                        overview += `\n#${final_index_number + 1} ${raid_data.TrainersTag[raid_data.Trainers.findIndex(x => x == zero_damage_users[j])].slice(0, -5)} -> Damage: 0`;
                                        if (raid_data.Trainers.findIndex(x => x == zero_damage_users[j]) == 0) overview += " :crown:";
                                    }

                                    var description = rewards_string + "\n" + overview;

                                    var difficulty_string = getDifficultyString(raid_data.RaidType);
                                    if (raid_data.Gigantamax != undefined && raid_data.Gigantamax == true) user.Raids.Completed.Gigantamax = user.Raids.Completed.Gigantamax ? user.Raids.Completed.Gigantamax + 1 : 1;
                                    user.Raids.Completed[difficulty_string] = user.Raids.Completed[difficulty_string] ? user.Raids.Completed[difficulty_string] + 1 : 1;

                                    // Add data to raid dex if raid is normal
                                    if (raid_data.Gigantamax != undefined && raid_data.Gigantamax == true) var raid_dex = user.Raids.EventDex.filter(x => x.PokemonId == raid_data.RaidPokemon.ID);
                                    else var raid_dex = user.Raids.RaidDex.filter(x => x.PokemonId == raid_data.RaidPokemon.ID);
                                    if (raid_dex[0]) {
                                        raid_dex[0].Completed[difficulty_string] = raid_dex[0].Completed[difficulty_string] ? raid_dex[0].Completed[difficulty_string] + 1 : 1;
                                    } else {
                                        var new_dex = {
                                            PokemonId: raid_data.RaidPokemon.ID,
                                            Completed: {}
                                        }
                                        new_dex.Completed[difficulty_string] = 1;
                                        if (raid_data.Gigantamax != undefined && raid_data.Gigantamax == true) user.Raids.EventDex.push(new_dex);
                                        else user.Raids.RaidDex.push(new_dex);
                                    }

                                    // Raid Dex completed reward
                                    if (user.RewardsCatalog != undefined && user.RewardsCatalog.RaidDexComplete != true) {
                                        var raid_pokemons = pokemons.filter(it => ((it["Legendary Type"] === "Mythical" || it["Primary Ability"] === "Beast Boost" || it["Legendary Type"] === "Legendary" || it["Legendary Type"] === "Sub-Legendary") && (it["Alternate Form Name"] === "Galar" || it["Alternate Form Name"] === "Alola" || it["Alternate Form Name"] === "Hisuian" || it["Alternate Form Name"] === "NULL") && !config.RAID_EXCEPTIONAL_POKEMON.some(ae => ae[0] == it["Pokemon Name"] && ae[1] == it["Alternate Form Name"])) || config.RAID_INCLUDE_POKEMON.some(ae => ae[0] == it["Pokemon Name"] && ae[1] == it["Alternate Form Name"]));
                                        raid_pokemons.forEach(element => {
                                            var dex_data = user.Raids.RaidDex.filter(it => it.PokemonId == element["Pokemon Id"]);
                                            dex_data = dex_data.length > 0 ? dex_data[0] : { Completed: {} };
                                            element.easy = dex_data.Completed.Easy ? dex_data.Completed.Easy : 0;
                                            element.normal = dex_data.Completed.Normal ? dex_data.Completed.Normal : 0;
                                            element.hard = dex_data.Completed.Hard ? dex_data.Completed.Hard : 0;
                                            element.challenge = dex_data.Completed.Challenge ? dex_data.Completed.Challenge : 0;
                                            element.intense = dex_data.Completed.Intense ? dex_data.Completed.Intense : 0;
                                            element.totaldefeated = element.easy + element.normal + element.hard + element.challenge + element.intense;
                                        });

                                        var user_defeated_raid_pokemons = raid_pokemons.filter(it => it.totaldefeated > 0);
                                        if (user_defeated_raid_pokemons.length >= raid_pokemons.length) {
                                            // Give reward
                                            var raid_dex_complete_reward = {
                                                Redeems: 1,
                                                PokeCredits: 15000
                                            }
                                            mail.sendmail(user_id, "Pokefort", "Raid Dex completed!", `Well, Who is the boss now ? You have encountered all the bosses in our collection. #SAVEBOSS`, raid_dex_complete_reward, undefined, true);
                                            user.RewardsCatalog.RaidDexComplete = true;
                                        }
                                    }

                                    // Event Raid Dex completed reward
                                    if (user.RewardsCatalog != undefined && user.RewardsCatalog.RaidEventDexComplete != true) {
                                        var raid_pokemons = pokemons.filter(it => it["Alternate Form Name"] == "Gigantamax");
                                        raid_pokemons.forEach(element => {
                                            var dex_data = user.Raids.EventDex.filter(it => it.PokemonId == element["Pokemon Id"]);
                                            dex_data = dex_data.length > 0 ? dex_data[0] : { Completed: {} };
                                            element.easy = dex_data.Completed.Easy ? dex_data.Completed.Easy : 0;
                                            element.normal = dex_data.Completed.Normal ? dex_data.Completed.Normal : 0;
                                            element.hard = dex_data.Completed.Hard ? dex_data.Completed.Hard : 0;
                                            element.challenge = dex_data.Completed.Challenge ? dex_data.Completed.Challenge : 0;
                                            element.intense = dex_data.Completed.Intense ? dex_data.Completed.Intense : 0;
                                            element.totaldefeated = element.easy + element.normal + element.hard + element.challenge + element.intense;
                                        });

                                        var user_defeated_raid_pokemons = raid_pokemons.filter(it => it.totaldefeated > 0);
                                        if (user_defeated_raid_pokemons.length >= raid_pokemons.length) {
                                            // Give reward
                                            var raid_eventdex_complete_reward = {
                                                Redeems: 1,
                                                PokeCredits: 15000
                                            }
                                            mail.sendmail(user_id, "Pokefort", "Raid Event Dex completed!", `Well, Who is the boss now ? You have encountered all the event bosses in our collection. #SAVEGMAXBOSS`, raid_eventdex_complete_reward, undefined, true);
                                            user.RewardsCatalog.RaidEventDexComplete = true;
                                        }
                                    }

                                    user.markModified('Raids.Completed');
                                    user.markModified('Raids');
                                    user.save().then(() => {

                                        // Send Dm message to all users.
                                        if (!raid_data.MutedTrainers.includes(user_id)) {
                                            var embed = new Discord.EmbedBuilder();
                                            embed.setTitle(`You defeated a level ${raid_data.RaidPokemon.Level} ${raid_data.RaidPokemon.Name.replaceAll("_r", "")}!`);
                                            embed.setDescription(description);
                                            var user_s = bot.users.cache.get(user_id)
                                            if (user_s) user_s.send({ embeds: [embed] });
                                            if (i < raid_data.Trainers.length) raid_boss_faint_loop(i + 1);
                                        } else { if (i < raid_data.Trainers.length) raid_boss_faint_loop(i + 1); }
                                    });
                                }
                            });
                        } else { if (i < raid_data.Trainers.length) raid_boss_faint_loop(i + 1); }
                    } raid_boss_faint_loop();
                });
            }

            // Raid Boss won.
            function raid_boss_won() {
                raid_data.remove().then(() => {
                    var channel_embed = new Discord.EmbedBuilder();
                    channel_embed.setTitle(`Raid Boss Won!`);
                    channel_embed.setDescription(`Raid Boss has defeated you! Try again next time!`);
                    channel_embed.setColor(interaction.member.displayHexColor);
                    interaction.channel.send({ embeds: [channel_embed] });
                    // Send Dm message to all users.
                    for (var i = 0; i < raid_data.Trainers.length; i++) {
                        if (raid_data.Trainers[i]) {
                            if (!raid_data.MutedTrainers.includes(raid_data.Trainers[i])) bot.users.cache.get(raid_data.Trainers[i]).send(`The ${raid_data.RaidPokemon.Name} raid was not completed. Try better next time!`);
                        }
                    }
                });
            }

            if (_raid_boss_fainted == false && _raid_boss_won == false) {

                // Raid Health and damage
                damage_addition();

                // Raid save state.
                raid_data.Stream = _battlestream.battle.inputLog.join('\n');

                // Add only names in UserStreamPokemons
                // Get all name using filter undefined.
                raid_data.UserStreamPokemons = _battlestream.battle.sides[0].pokemon.filter(x => x.set.name != undefined).map(x => x.set.name);

                // Save to database.
                raid_data.RaidPokemon.Health = _battlestream.battle.sides[1].pokemon[0].hp;
                raid_data.RaidPokemon.PreviousHealth = _battlestream.battle.sides[1].pokemon[0].hp;
                raid_data.RaidPokemon.markModified();
                raid_data.save();
            }
        }
        //#endregion
    })();
}

// Move thinker based on type effectiveness and base power.
function move_thinker(battle, current_pokemon) {
    var damages = [];
    var source = battle.sides[1].pokemon[0];
    var target = battle.sides[0].pokemon[current_pokemon];
    var moves = source.moves;

    for (var i = 0; i < moves.length; i++) {
        var dmg = damage_calc(battle, source, target, moves[i]);
        if (dmg) damages.push([dmg[0], dmg[1], moves[i]]);
        else damages.push([-2, 0, moves[i]]);
    }
    damages = damages.filter(x => x[0] != undefined);
    if (damages.length == 0) return 1;
    damages.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    /* By chance if next damage is higher
       But current effective is 2 
       And next effective is 1 -> Swap this alone
    */
    if (damages.length > 1 && damages[0][0] == 2 && damages[1][0] == 1 && ((damages[1][1] - damages[0][1]) > 300)) [damages[0], damages[1]] = [damages[1], damages[0]]
    var raid_move = damages[0];
    var move_index = moves.indexOf(raid_move[2]) + 1;
    return move_index;
}

function damage_calc(battle, source, target, move) {
    move = battle.dex.getActiveMove(move);
    if (!move.ignoreImmunity || (move.ignoreImmunity !== true && !move.ignoreImmunity[move.type])) {
        if (!target.runImmunity(move.type)) {
            return false;
        }
    }
    if (move.ohko)
        return target.maxhp;
    if (move.damageCallback)
        return move.damageCallback.call(battle, source, target);
    if (move.damage === 'level') {
        return source.level;
    }
    else if (move.damage) {
        return move.damage;
    }
    const category = battle.getCategory(move);
    let basePower = move.basePower;
    if (move.basePowerCallback) {
        basePower = move.basePowerCallback.call(battle, source, target, move);
    }
    if (!basePower)
        return basePower === 0 ? undefined : basePower;
    basePower = clampIntRange(basePower, 1);
    // happens after
    basePower = battle.runEvent('BasePower', source, target, move, basePower, true);
    if (!basePower)
        return 0;
    basePower = clampIntRange(basePower, 1);
    // Hacked Max Moves have 0 base power, even if you Dynamax
    if ((!source.volatiles['dynamax'] && move.isMax) || (move.isMax && this.dex.moves.get(move.baseMove).isMax)) {
        basePower = 0;
    }

    const level = source.level;
    const attacker = move.overrideOffensivePokemon === 'target' ? target : source;
    const defender = move.overrideDefensivePokemon === 'source' ? source : target;
    const isPhysical = move.category === 'Physical';
    let attackStat = move.overrideOffensiveStat || (isPhysical ? 'atk' : 'spa');
    const defenseStat = move.overrideDefensiveStat || (isPhysical ? 'def' : 'spd');;
    let attack = attacker.storedStats[attackStat];
    let defense = defender.storedStats[attackStat];
    attackStat = (category === 'Physical' ? 'atk' : 'spa');
    if (battle.gen <= 4 && ['explosion', 'selfdestruct'].includes(move.id) && defenseStat === 'def') {
        defense = clampIntRange(Math.floor(defense / 2), 1);
    }
    const tr = battle.trunc;
    const baseDamage = tr(tr(tr(tr(2 * level / 5 + 2) * basePower * attack) / defense) / 50);
    return modifyDamage(battle, baseDamage, source, target, move);
}

function modifyDamage(battle, baseDamage, pokemon, target, move) {
    const tr = battle.trunc;
    if (!move.type)
        move.type = '???';
    const type = move.type;
    baseDamage += 2;
    if (move.spreadHit) {
        // multi-target modifier (doubles only)
        const spreadModifier = move.spreadModifier || (battle.gameType === 'freeforall' ? 0.5 : 0.75);
        baseDamage = battle.modify(baseDamage, spreadModifier);
    }
    else if (move.multihitType === 'parentalbond' && move.hit > 1) {
        // Parental Bond modifier
        const bondModifier = battle.gen > 6 ? 0.25 : 0.5;
        baseDamage = battle.modify(baseDamage, bondModifier);
    }
    if (move.forceSTAB || (type !== '???' && pokemon.hasType(type))) {
        baseDamage = battle.modify(baseDamage, move.stab || 1.5);
    }
    // types
    let typeMod = target.runEffectiveness(move);
    typeMod = clampIntRange(typeMod, -6, 6);
    target.getMoveHitData(move).typeMod = typeMod;
    if (typeMod > 0) {
        for (let i = 0; i < typeMod; i++) {
            baseDamage *= 2;
        }
    }
    if (typeMod < 0) {
        for (let i = 0; i > typeMod; i--) {
            baseDamage = tr(baseDamage / 2);
        }
    }
    if (pokemon.status === 'brn' && move.category === 'Physical' && !pokemon.hasAbility('guts')) {
        if (battle.gen < 6 || move.id !== 'facade') {
            baseDamage = battle.modify(baseDamage, 0.5);
        }
    }
    if (battle.gen === 5 && !baseDamage)
        baseDamage = 1;
    // Final modifier. Modifiers that modify damage after min damage check, such as Life Orb.
    //  baseDamage = battle.runEvent('ModifyDamage', pokemon, target, move, baseDamage);
    if (move.isZOrMaxPowered && target.getMoveHitData(move).zBrokeProtect) {
        baseDamage = battle.modify(baseDamage, 0.25);
    }
    // Generation 6-7 moves the check for minimum 1 damage after the final modifier...
    if (battle.gen !== 5 && !baseDamage)
        return 1;
    // ...but 16-bit truncation happens even later, and can truncate to 0
    return [typeMod, tr(baseDamage, 16)];
}

// Function utils [Imported from Showdown Utils]
function clampIntRange(num, min, max) {
    if (typeof num !== 'number')
        num = 0;
    num = Math.floor(num);
    if (min !== undefined && num < min)
        num = min;
    if (max !== undefined && num > max)
        num = max;
    return num;
}

// Function to convert difficulty to string.
function getDifficultyString(difficulty) {
    switch (difficulty) {
        case 0:
            return "Easy";
        case 1:
            return "Normal";
        case 2:
            return "Hard";
        case 3:
            return "Challenge";
        case 4:
            return "Intense";
    }
}

// Random move.
function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

module.exports.config = {
    name: "use",
    description: "Use a move.",
    options: [{
        name: "move",
        description: "The move to use.",
        required: true,
        type: 4,
        min_value: 1,
        max_value: 4
    }],
    aliases: []
}
