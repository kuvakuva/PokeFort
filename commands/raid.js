const Discord = require('discord.js');
const mergeImages = require('merge-images-v2');
const Canvas = require('canvas');

// Models
const user_model = require('../models/user');
const raid_model = require('../models/raids');

//Utils
const getPokemons = require('../utils/getPokemon');
const { floor } = require('lodash');

module.exports.run = async (bot, message, args, prefix, user_available, pokemons) => {
    if (!user_available) { message.channel.send(`You should have started to use this command! Use ${prefix}start to begin the journey!`); return; }

    if (args.length == 1 && args[0].toLowerCase() == "spawn") {
        // User check if raid scheme has trainer included.
        raid_model.findOne({ $and: [{ Trainers: { $in: message.author.id } }, { Timestamp: { $gt: Date.now() } }] }, (err, raid) => {
            if (err) { console.log(err); return; }
            if (raid) {
                message.channel.send(`You are already in a raid.`);
                return;
            }
            else {
                // Get user data.
                user_model.findOne({ UserID: message.author.id }, (err, user) => {
                    if (err) { console.log(err); return; }
                    if (user) {
                        var last_raid_time = user.RaidSpawn;
                        // check if 3 hours passed since last raid spawn.
                        // Remove me last ride cooldown.
                        if (last_raid_time == undefined || (new Date().getTime() - last_raid_time) < 10800000) {
                            // Decide raid boss based on random.
                            const mythical_pokemons = pokemons.filter(it => it["Legendary Type"] === "Mythical" && it["Alternate Form Name"] === "NULL");
                            const ultra_beast_pokemons = pokemons.filter(it => it["Primary Ability"] === "Beast Boost" && it["Alternate Form Name"] === "NULL");
                            const legendary_pokemons = pokemons.filter(it => it["Legendary Type"] === "Legendary" && it["Alternate Form Name"] === "NULL");
                            const sub_legendary_pokemons = pokemons.filter(it => it["Legendary Type"] === "Sub-Legendary" && it["Alternate Form Name"] === "NULL");
                            const gigantamax_pokemons = pokemons.filter(it => it["Alternate Form Name"] === "Gigantamax");
                            const mega_pokemons = pokemons.filter(it => it["Alternate Form Name"].includes("Mega"));
                            const galarian_pokemons = pokemons.filter(it => it["Alternate Form Name"] === "Galar");
                            const alolan_pokemons = pokemons.filter(it => it["Alternate Form Name"] === "Alola");
                            const hisuian_pokemons = pokemons.filter(it => it["Alternate Form Name"] === "Hisuian");

                            var raid_pokemons = mythical_pokemons.concat(ultra_beast_pokemons, legendary_pokemons, sub_legendary_pokemons, galarian_pokemons, alolan_pokemons, mega_pokemons, hisuian_pokemons);
                            var raid_boss = raid_pokemons[Math.floor(Math.random() * raid_pokemons.length)];
                            var raid_boss_name = getPokemons.get_pokemon_name_from_id(raid_boss["Pokemon Id"], pokemons, false);

                            // Decide Easy, Normal, Hard, Challenge, Intense based on random.
                            var difficulty = Math.floor(Math.random() * 4);
                            var raid_type = "";
                            var raid_level = 0;
                            var raid_rewards = "";
                            var raid_time_left = 0;
                            switch (difficulty) {
                                case 0:
                                    raid_type = "Easy";
                                    raid_level = randomInteger(200, 300);
                                    raid_rewards = `-Credits\n-Redeems: 0.1% Chance\n-Wishing Pieces: 0.25% Chance\n-${raid_boss_name}: 0.05% Chance\nBoth the raid leader and the trainer that deals the most damage will have 1.5x the drop rates!`
                                    raid_time_left = new Date().setSeconds(new Date().getSeconds() + 7199);
                                    break;
                                case 1:
                                    raid_type = "Normal";
                                    raid_level = randomInteger(600, 800);
                                    raid_rewards = `-Credits\n-Redeems: 0.1% Chance\n-Wishing Pieces: 1% Chance\n-${raid_boss_name}: 1% Chance\nBoth the raid leader and the trainer that deals the most damage will have 1.5x the drop rates!`;
                                    raid_time_left = new Date().setSeconds(new Date().getSeconds() + 7199);
                                    break;
                                case 2:
                                    raid_type = "Hard";
                                    raid_level = randomInteger(1600, 1800);
                                    raid_rewards = `-Credits\n-Redeems: 0.5% Chance\n-Wishing Pieces: 5% Chance\n-${raid_boss_name}: 5% Chance\nBoth the raid leader and the trainer that deals the most damage will have 1.5x the drop rates!`;
                                    raid_time_left = new Date().setSeconds(new Date().getSeconds() + 10799);
                                    break;
                                case 3:
                                    raid_type = "Challenge";
                                    raid_level = randomInteger(2600, 2800);
                                    raid_rewards = `-Credits\n-Redeems: 1% Chance\n-Wishing Pieces: 10% Chance\n-${raid_boss_name}: 10% Chance\nBoth the raid leader and the trainer that deals the most damage will have 1.5x the drop rates!`;
                                    raid_time_left = new Date().setSeconds(new Date().getSeconds() + 14399);
                                    break;
                                case 4:
                                    raid_type = "Intense";
                                    raid_level = randomInteger(3400, 3500);
                                    raid_rewards = `-Credits\n-Redeems: 5% Chance\n-Wishing Pieces: 25% Chance\n-${raid_boss_name}: 25% Chance\nBoth the raid leader and the trainer that deals the most damage will have 1.5x the drop rates!`;
                                    raid_time_left = new Date().setSeconds(new Date().getSeconds() + 14399);
                                    break;
                            }

                            var stats = getRaidStats([raid_boss["Health Stat"], raid_boss["Attack Stat"], raid_boss["Defense Stat"], raid_boss["Special Attack Stat"], raid_boss["Special Defense Stat"], raid_boss["Speed Stat"]], raid_level, difficulty);

                            // Stats String
                            var stats_string = `Health: ${stats[0]}\nAttack: ${stats[1]}\nDefense: ${stats[2]}\nSpecial Attack: ${stats[3]}\nSpecial Defense: ${stats[4]}\nSpeed: ${stats[5]}`;
                            var raid_boss_image = getPokemons.imagefromid(raid_boss["Pokemon Id"], pokemons, false, true);

                            // Time String
                            var raid_time_left_string = "";
                            var future_timeout = raid_time_left;
                            raid_time_left = new Date(new Date(raid_time_left).getTime() - new Date().getTime());
                            raid_time_left_string = `${raid_time_left.getUTCHours()}:${raid_time_left.getUTCMinutes()}:${raid_time_left.getUTCSeconds()}`;

                            var embed = new Discord.MessageEmbed();
                            embed.attachFiles(raid_boss_image[1]);
                            embed.setTitle(`${message.author.username} has started a raid battle!`);
                            embed.addField(`Level ${raid_level} ${raid_boss_name}`, stats_string, false);
                            embed.addField(`Trainers:`, `Trainer #1: ${message.author.tag}\nTrainer #2: None\nTrainer #3: None\nTrainer #4: None`, false);
                            embed.addField(`Obtainable Rewards:`, raid_rewards, false);
                            embed.setImage('attachment://' + raid_boss_image[0] + ".png")

                            var unique = String(new Date().valueOf()).substring(3, 13);

                            description = `**RaidID: ${unique}\n` + `Difficulty: ${raid_type}\n` + `Time Left: ${raid_time_left_string}**`;
                            embed.setDescription(description);
                            embed.setFooter(`To join this raid, do ${prefix}r join ${unique}. To start the raid, the raid leader needs to do ${prefix}r start. To duel the raid boss, do ${prefix}r duel.`)

                            // Type of pokemon.
                            var type = [raid_boss["Primary Type"]];
                            if (raid_boss["Secondary Type"] != "NULL") type.push(raid_boss["Secondary Type"]);

                            // Start server side works.
                            raid_data = new raid_model({
                                RaidID: unique,
                                RaidType: difficulty,
                                Started: false,
                                Timestamp: future_timeout,
                                RaidPokemon: {
                                    ID: raid_boss["Pokemon Id"],
                                    Name: raid_boss_name,
                                    Level: raid_level,
                                    Image: raid_boss_image,
                                    Health: stats[0],
                                    MaxHealth: stats[0],
                                    Attack: stats[1],
                                    Defense: stats[2],
                                    SpAttack: stats[3],
                                    SpDefense: stats[4],
                                    Speed: stats[5],
                                    Weather: {
                                        Name: "Clear Skies"
                                    },
                                },
                                Trainers: [message.author.id],
                                TrainersTag: [message.author.tag]
                            });

                            // Save user data.
                            user.RaidsSpawned = user.RaidsSpawned != undefined ? user.RaidsSpawned + 1 : 1;
                            user.RaidSpawn = Date.now();
                            raid_data.save().then(() => {
                                user.save().then(() => {
                                    message.channel.send(embed);
                                });
                            });
                        }
                        else {
                            // Get time left until next raid spawn in hh:mm:ss format.
                            var time_left = new Date(last_raid_time + 10800000 - Date.now());
                            var time_left_string = time_left.getUTCHours() + ":" + time_left.getUTCMinutes() + ":" + time_left.getUTCSeconds();
                            return message.channel.send(`Time left to be able to spawn a raid: ${time_left_string}`);
                        }
                    }
                });
            }
        });
    }
    else if (args.length == 1 && args[0].toLowerCase() == "start") {
        // User check if raid scheme has trainer included.
        raid_model.findOne({ $and: [{ Trainers: { $in: message.author.id } }, { Timestamp: { $gt: Date.now() } }] }, (err, raid) => {
            if (err) { console.log(err); return; }
            if (raid) {
                if (raid.Trainers[0] != message.author.id) return message.channel.send(`You are not the raid leader.`);
                else {
                    raid.Started = true;
                    raid.save().then(() => {
                        message.channel.send(`You have started the raid.`);
                    });
                }
            }
            else return message.channel.send(`You are not in a raid.`);
        });
    }
    else if (args.length == 2 && args[0].toLowerCase() == "join" && digits_only(args[1])) {
        // User check if raid scheme has trainer included.
        raid_model.findOne({ $and: [{ Trainers: { $in: message.author.id } }, { Timestamp: { $gt: Date.now() } }] }, (err, raid) => {
            if (err) { console.log(err); return; }
            if (raid) {
                message.channel.send(`You are already in a raid.`);
                return;
            }
            else {
                raid_model.findOne({ $and: [{ RaidID: parseInt(args[1]) }, { Timestamp: { $gt: Date.now() } }] }, (err, raid_data) => {
                    if (err) { console.log(err); return; }
                    if (!raid_data) return message.channel.send(`No raid found with that ID.`);
                    else {
                        if (raid_data.Started) return message.channel.send(`Raid has already started.`);
                        else {
                            if (raid_data.Ban != undefined && raid_data.Ban.includes(message.author.id)) return message.channel.send(`Sorry, You can't enter this raid.`);
                            if (raid_data.Trainers.length == 4) return message.channel.send(`The specified raid already has 4 trainers.`);
                            else {
                                user_model.findOne({ UserID: message.author.id }, (err, user) => {
                                    if (err) { console.log(err); return; }
                                    if (user) {
                                        user.RaidsJoined = user.RaidsJoined != undefined ? user.RaidsJoined + 1 : 1;
                                        raid_data.Trainers.push(message.author.id);
                                        raid_data.TrainersTag.push(message.author.tag);
                                        raid_data.save().then(() => {
                                            user.save().then(() => {
                                                // Stats String
                                                var stats_string = `Health: ${raid_data.RaidPokemon.Health}\nAttack: ${raid_data.RaidPokemon.Attack}\nDefense: ${raid_data.RaidPokemon.Defense}\nSpecial Attack: ${raid_data.RaidPokemon.SpAttack}\nSpecial Defense: ${raid_data.RaidPokemon.SpDefense}\nSpeed: ${raid_data.RaidPokemon.Speed}`;
                                                var raid_boss_image = getPokemons.imagefromid(raid_data.RaidPokemon.ID.toString(), pokemons, false, true);

                                                // Time String
                                                var raid_time_left_string = "";
                                                raid_time_left = new Date(new Date(raid_data.Timestamp).getTime() - new Date().getTime());
                                                raid_time_left_string = `${raid_time_left.getUTCHours()}:${raid_time_left.getUTCMinutes()}:${raid_time_left.getUTCSeconds()}`;

                                                var embed = new Discord.MessageEmbed();
                                                embed.attachFiles(raid_boss_image[1]);
                                                embed.setTitle(`${message.author.username} has joined a raid battle!`);
                                                embed.addField(`Level ${raid_data.RaidPokemon.Level} ${raid_data.RaidPokemon.Name}`, stats_string, false);

                                                var trainer_data = "";
                                                for (var i = 0; i < 4; i++) {
                                                    trainer_data += `Trainer #${i + 1}: ${raid_data.TrainersTag[i] != undefined ? raid_data.TrainersTag[i] : "None"}\n`
                                                }

                                                embed.addField(`Trainers:`, trainer_data, false);
                                                embed.addField(`Obtainable Rewards:`, getRewards(raid_data.RaidType, raid_data.RaidPokemon.Name), false);
                                                embed.setImage('attachment://' + raid_boss_image[0] + ".png")
                                                description = `**RaidID: ${raid_data.RaidID}\n` + `Difficulty: ${getDifficultyString(raid_data.RaidType)}\n` + `Time Left: ${raid_time_left_string}**`;
                                                embed.setDescription(description);
                                                embed.setFooter(`To join this raid, do ${prefix}r join ${raid_data.RaidID}. To start the raid, the raid leader needs to do ${prefix}r start. To duel the raid boss, do ${prefix}r duel.`)
                                                message.channel.send(embed);
                                            });
                                        });
                                    }
                                });
                            }
                        }
                    }
                });
            }
        });
    }
    else if (args.length == 1 && args[0].toLowerCase() == "info") {
        // User check if raid scheme has trainer included.
        raid_model.findOne({ $and: [{ Trainers: { $in: message.author.id } }, { Timestamp: { $gt: Date.now() } }] }, (err, raid_data) => {
            if (err) { console.log(err); return; }
            if (raid_data) {
                // Stats String
                var stats_string = `Health: ${raid_data.RaidPokemon.Health}\nAttack: ${raid_data.RaidPokemon.Attack}\nDefense: ${raid_data.RaidPokemon.Defense}\nSpecial Attack: ${raid_data.RaidPokemon.SpAttack}\nSpecial Defense: ${raid_data.RaidPokemon.SpDefense}\nSpeed: ${raid_data.RaidPokemon.Speed}`;
                var raid_boss_image = getPokemons.imagefromid(raid_data.RaidPokemon.ID.toString(), pokemons, false, true);

                // Time String
                var raid_time_left_string = "";
                raid_time_left = new Date(new Date(raid_data.Timestamp).getTime() - new Date().getTime());
                raid_time_left_string = `${raid_time_left.getUTCHours()}:${raid_time_left.getUTCMinutes()}:${raid_time_left.getUTCSeconds()}`;

                var embed = new Discord.MessageEmbed();
                embed.attachFiles(raid_boss_image[1]);
                if (raid_data.Started) embed.setTitle(`Raid Has Started!`);
                else embed.setTitle(`Raid Has Not Started!`);
                embed.addField(`Level ${raid_data.RaidPokemon.Level} ${raid_data.RaidPokemon.Name}`, stats_string, false);

                var trainer_data = "";
                for (var i = 0; i < 4; i++) {
                    trainer_data += `Trainer #${i + 1}: ${raid_data.TrainersTag[i] != undefined ? raid_data.TrainersTag[i] : "None"}`
                    if (raid_data.CompletedDuel != undefined && raid_data.CompletedDuel.includes(raid_data.Trainers[i])) trainer_data += " :white_check_mark:\n";
                    else if (raid_data.CurrentDuel != undefined && raid_data.CurrentDuel == raid_data.Trainers[i]) trainer_data += " -> Currently Attacking\n";
                    else trainer_data += "\n";
                }

                embed.addField(`Trainers:`, trainer_data, false);
                embed.addField(`Obtainable Rewards:`, getRewards(raid_data.RaidType, raid_data.RaidPokemon.Name), false);
                embed.setImage('attachment://' + raid_boss_image[0] + ".png")
                description = `**RaidID: ${raid_data.RaidID}\n` + `Difficulty: ${getDifficultyString(raid_data.RaidType)}\n` + `Time Left: ${raid_time_left_string}**`;
                embed.setDescription(description);
                embed.setFooter(`To join this raid, do ${prefix}r join ${raid_data.RaidID}. To start the raid, the raid leader needs to do ${prefix}r start. To duel the raid boss, do ${prefix}r duel.`)
                message.channel.send(embed);
            }
            else return message.channel.send(`You are not in a raid.`);
        });
    }
    else if (args.length == 2 && args[0].toLowerCase() == "kick" && isInt(args[1])) {
        // User check if raid scheme has trainer included.
        raid_model.findOne({ $and: [{ Trainers: { $in: message.author.id } }, { Timestamp: { $gt: Date.now() } }] }, (err, raid) => {
            if (err) { console.log(err); return; }
            if (raid) {
                if (raid.Trainers[0] != message.author.id) return message.channel.send(`You are not the raid leader.`);
                if (raid.Trainers[args[1] - 1] == message.author.id) return message.channel.send(`You can't kick yourself.`);
                if (raid.Trainers[args[1] - 1] == undefined) return message.channel.send(`No trainer found at that number.`);

                raid.Trainers.splice(args[1] - 1, 1);
                var kicked_user = raid.TrainersTag.splice(args[1] - 1, 1);
                raid.save().then(() => {
                    message.channel.send(`You have kicked \`${kicked_user}\` from the raid.`);
                });

            } else return message.channel.send(`You are not in a raid.`);
        });
    }
    else if (args.length == 2 && args[0].toLowerCase() == "ban" && isInt(args[1])) {
        // User check if raid scheme has trainer included.
        raid_model.findOne({ $and: [{ Trainers: { $in: message.author.id } }, { Timestamp: { $gt: Date.now() } }] }, (err, raid) => {
            if (err) { console.log(err); return; }
            if (raid) {
                if (raid.Trainers[0] != message.author.id) return message.channel.send(`You are not the raid leader.`);
                if (raid.Trainers[args[1] - 1] == message.author.id) return message.channel.send(`You can't ban yourself.`);
                if (raid.Trainers[args[1] - 1] == undefined) return message.channel.send(`No trainer found at that number.`);

                raid.Ban.push(raid.Trainers[args[1] - 1]);
                raid.Trainers.splice(args[1] - 1, 1);
                var banned_user = raid.TrainersTag.splice(args[1] - 1, 1);
                raid.save().then(() => {
                    message.channel.send(`You have banned \`${banned_user}\` from the raid.`);
                });

            } else return message.channel.send(`You are not in a raid.`);
        });
    }
    else if (args.length == 1 && args[0].toLowerCase() == "leave") {
        // User check if raid scheme has trainer included.
        raid_model.findOne({ $and: [{ Trainers: { $in: message.author.id } }, { Timestamp: { $gt: Date.now() } }] }, (err, raid) => {
            if (err) { console.log(err); return; }
            if (raid) {
                // Get user data.
                user_model.findOne({ UserID: message.author.id }, (err, user) => {
                    if (err) { console.log(err); return; }
                    if (user) {
                        user.RaidsLeft = user.RaidsLeft != undefined ? user.RaidsLeft + 1 : 1;
                        var remove_index = raid.Trainers.indexOf(message.author.id);
                        raid.Trainers.splice(remove_index, 1);
                        raid.TrainersTag.splice(remove_index, 1);
                        raid.save().then(() => {
                            user.save().then(() => {
                                message.channel.send(`You have left the raid.`);
                            });
                        });
                    }
                });
            }
            else return message.channel.send("You are not in a raid.");
        });
    }
    else if (args.length == 1 && args[0].toLowerCase() == "duel") {
        // User check if raid scheme has trainer included.
        raid_model.findOne({ $and: [{ Trainers: { $in: message.author.id } }, { Timestamp: { $gt: Date.now() } }] }, (err, raid) => {
            if (err) { console.log(err); return; }
            if (raid) {
                user_model.findOne({ UserID: message.author.id }, (err, user) => {
                    var team = user.Teams.filter(team => team.Selected == true)[0];
                    if (team == undefined) return message.channel.send(`You should select a team or create a team to enter a raid duel!`);
                    if (!raid.Started) return message.channel.send("This raid has not started yet!");
                    if (raid.CurrentDuel != undefined && raid.CurrentDuel == message.author.id) return message.channel.send("You are already in duel with this raid boss!");
                    if (raid.CurrentDuel != undefined) return message.channel.send("A user is already dueling this raid boss!");
                    if (team.Pokemons.isNull()) return message.channel.send("Your team should not be empty.");

                    // Get pokemons details
                    getPokemons.getallpokemon(message.author.id).then(user_pokemons => {

                        // Transfer team pokemons to trainers data.
                        var trainer_data = transferTeamData(team, user_pokemons, pokemons);

                        // Get image url of user team pokemon.
                        var user_pokemon_data = trainer_data.filter(pokemon => pokemon != null)[0];
                        var user_image_data = user_pokemon_data.Image;
                        var current_pokemon = trainer_data.indexOf(user_pokemon_data);

                        // Packing raid data.
                        raid.CurrentDuel = message.author.id;
                        raid.TrainersTeam = trainer_data;
                        raid.CurrentPokemon = current_pokemon;

                        raid.save().then(() => {

                            // Get image url of raid boss.
                            var raid_boss_image_data = raid.RaidPokemon.Image;

                            // Creating Image for embed.
                            mergeImages(["./assets/raid_images/background.jpeg",
                                { src: user_image_data[1], x: 80, y: 180, width: 200, height: 200 }, { src: raid_boss_image_data[1], x: 430, y: 20, width: 360, height: 360 }], {
                                Canvas: Canvas
                            }).then(b64 => {
                                const img_data = b64.split(',')[1];
                                const img_buffer = new Buffer.from(img_data, 'base64');
                                const image_file = new Discord.MessageAttachment(img_buffer, 'img.jpeg');

                                // Sending duel message.
                                var embed = new Discord.MessageEmbed();
                                embed.setTitle(`${message.author.username.toUpperCase()} VS Raid Boss!`);
                                embed.setDescription(`**Weather: ${raid.RaidPokemon.Weather.Name}**`);
                                embed.addField(`${message.author.username}'s Pokémon`, `${user_pokemon_data.Name} | ${user_pokemon_data.Health}/${user_pokemon_data.MaxHealth}HP`, true);
                                embed.addField(`Raid Boss`, `${raid.RaidPokemon.Name} | ${raid.RaidPokemon.Health}/${raid.RaidPokemon.MaxHealth}HP`, true);
                                embed.setColor(message.guild.me.displayHexColor);
                                embed.attachFiles(image_file)
                                embed.setImage('attachment://img.jpeg');
                                embed.setFooter(`Use ${prefix}teaminfo to see the current state of your team as well as what moves your pokemon has available to them!`);
                                message.channel.send(embed);
                            });
                        });
                    });
                });
            }
            else return message.channel.send(`You are not in a raid.`);
        });
    }
    else return message.channel.send("Invalid syntax.");
}

// Transfer team data to trainers data.
function transferTeamData(team_data, user_pokemons, pokemons) {
    var trainersteam = [];
    for (i = 0; i < team_data.Pokemons.length; i++) {

        // First step check if data is null.
        if (team_data["Pokemons"][i] == null) trainersteam.push(null);

        // Second step check if user still have that pokemon.
        else {
            var pokemon_from_db = user_pokemons.filter(it => it._id == team_data["Pokemons"][i])[0];
            if (pokemon_from_db == undefined) trainersteam.push(null);

            // Third step add pokemon to trainer team.
            else {
                var move_data = [];
                for (var j = 0; j < 4; j++) {
                    if (pokemon_from_db.Moves != undefined && pokemon_from_db.Moves[j + 1] != undefined) {
                        var move_name = pokemon_from_db.Moves[j + 1].replace(" (TM)", "");
                        move_data.push(move_name);
                    } else move_data.push(`Tackle`)
                }

                var static_pokemons = pokemons.filter(it => it["Pokemon Id"] == pokemon_from_db.PokemonId)[0];

                // Add stats to the pokemons.
                var nature_value = nature_of(pokemon_from_db.Nature);

                var health = floor(0.01 * (2 * static_pokemons["Health Stat"] + pokemon_from_db.IV[0] + floor(0.25 * 0)) * pokemon_from_db.Level) + pokemon_from_db.Level + 10;
                health += percentage(health, nature_value[1]);
                var attack = floor(0.01 * (2 * static_pokemons["Attack Stat"] + pokemon_from_db.IV[1] + floor(0.25 * 0)) * pokemon_from_db.Level) + 5;
                attack += percentage(attack, nature_value[2]);
                var defense = floor(0.01 * (2 * static_pokemons["Defense Stat"] + pokemon_from_db.IV[2] + floor(0.25 * 0)) * pokemon_from_db.Level) + 5;
                defense += percentage(defense, nature_value[3]);
                var special_attack = floor(0.01 * (2 * static_pokemons["Special Attack Stat"] + pokemon_from_db.IV[3] + floor(0.25 * 0)) * pokemon_from_db.Level) + 5;
                special_attack += percentage(special_attack, nature_value[4]);
                var special_defense = floor(0.01 * (2 * static_pokemons["Special Defense Stat"] + pokemon_from_db.IV[4] + floor(0.25 * 0)) * pokemon_from_db.Level) + 5;
                special_defense += percentage(special_defense, nature_value[5]);
                var speed = floor(0.01 * (2 * static_pokemons["Speed Stat"] + pokemon_from_db.IV[5] + floor(0.25 * 0)) * pokemon_from_db.Level) + 5;
                speed += percentage(speed, nature_value[6]);

                // Get image url.
                var image = getPokemons.imagefromid(pokemon_from_db.PokemonId, pokemons, pokemon_from_db.Shiny, true);

                // Type of pokemon.
                var type = [static_pokemons["Primary Type"]];
                if (static_pokemons["Secondary Type"] != "NULL") type.push(static_pokemons["Secondary Type"]);

                var data_to_add = {
                    UniqueID: pokemon_from_db._id,
                    ID: pokemon_from_db.PokemonId,
                    Name: getPokemons.get_pokemon_name_from_id(pokemon_from_db["PokemonId"], pokemons, pokemon_from_db.Shiny, true),
                    Level: pokemon_from_db.Level,
                    IV: pokemon_from_db.IV,
                    Type: type,
                    MaxHealth: health,
                    Health: health,
                    Attack: attack,
                    Defense: defense,
                    SpAttack: special_attack,
                    SpDefense: special_defense,
                    Speed: speed,
                    Image: image,
                    Nature: pokemon_from_db.Nature,
                    Moves: move_data,
                    Fainted: false
                }
                trainersteam.push(data_to_add);
            }
        }
    }
    return trainersteam;
}

// Decide raid stats calculation formula.
function getRaidStats(base_stat, raid_level, difficulty) {
    var raid_stats = [];
    raid_stats.push(floor(floor(0.01 * (2 * 100 + Math.floor(Math.random() * 31)) * raid_level) + raid_level * 10 * 2.31 * 2.11));

    switch (difficulty) {
        // Easy
        case 0:
            for (var i = 1; i < 6; i++) {
                raid_stats.push(floor(floor(0.01 * (2 * base_stat[i] + Math.floor(Math.random() * 31)) * raid_level) / 1.81));
            }
            break;
        // Normal
        case 1:
            for (var i = 1; i < 6; i++) {
                raid_stats.push(floor((floor(0.01 * (2 * base_stat[i] + Math.floor(Math.random() * 31)) * raid_level) / 2.22) / 2.12));
            }
            break;
        // Hard
        case 2:
            for (var i = 1; i < 6; i++) {
                raid_stats.push(floor(floor(0.01 * (2 * base_stat[i] + Math.floor(Math.random() * 31)) * raid_level) / 3.2 / 3.2) + 20);
            }
            break;
        // Challenge
        case 3:
            for (var i = 1; i < 6; i++) {
                raid_stats.push(floor((floor(0.01 * (2 * base_stat[i] + Math.floor(Math.random() * 31)) * raid_level) / 4) / 3.3));
            }
            break;
        // Intense
        case 4:
            for (var i = 1; i < 6; i++) {
                raid_stats.push(floor((floor(0.01 * (2 * base_stat[i] + Math.floor(Math.random() * 31)) * raid_level) / 5.2) / 3) + Math.floor(Math.random() * 30));
            }
            break;
    }
    return raid_stats;
}

// Prototype to check if array is only null.
Array.prototype.isNull = function () {
    return this.join().replace(/,/g, '').length === 0;
};

// Digits only check.
const digits_only = string => [...string].every(c => '0123456789'.includes(c));

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

// Function to get obtainable rewards.
function getRewards(difficulty, raid_boss_name) {
    var raid_rewards = "";
    switch (difficulty) {
        // Easy
        case 0:
            raid_rewards = `-Credits\n-Redeems: 0.1% Chance\n-Wishing Pieces: 0.25% Chance\n-${raid_boss_name}: 0.05% Chance\nBoth the raid leader and the trainer that deals the most damage will have 1.5x the drop rates!`
            break;
        // Normal
        case 1:
            raid_rewards = `-Credits\n-Redeems: 0.1% Chance\n-Wishing Pieces: 1% Chance\n-${raid_boss_name}: 1% Chance\nBoth the raid leader and the trainer that deals the most damage will have 1.5x the drop rates!`;
            break;
        // Hard
        case 2:
            raid_rewards = `-Credits\n-Redeems: 0.5% Chance\n-Wishing Pieces: 5% Chance\n-${raid_boss_name}: 5% Chance\nBoth the raid leader and the trainer that deals the most damage will have 1.5x the drop rates!`;
            break;
        // Challenge
        case 3:
            raid_rewards = `-Credits\n-Redeems: 1% Chance\n-Wishing Pieces: 10% Chance\n-${raid_boss_name}: 10% Chance\nBoth the raid leader and the trainer that deals the most damage will have 1.5x the drop rates!`;
            break;
        // Intense
        case 4:
            raid_rewards = `-Credits\n-Redeems: 5% Chance\n-Wishing Pieces: 25% Chance\n-${raid_boss_name}: 25% Chance\nBoth the raid leader and the trainer that deals the most damage will have 1.5x the drop rates!`;
            break;
    }
    return raid_rewards;
}

// Function to get the nature from number.
function nature_of(int) {
    if (int == 0) { return ["Adamant", 0, 10, 0, -10, 0, 0] }
    else if (int == 1) { return ["Adamant", 0, 10, 0, -10, 0, 0] }
    else if (int == 2) { return ["Bashful", 0, 0, 0, 0, 0, 0] }
    else if (int == 3) { return ["Bold", 0, -10, 10, 0, 0, 0] }
    else if (int == 4) { return ["Brave", 0, 10, 0, 0, 0, -10] }
    else if (int == 5) { return ["Calm", 0, -10, 0, 0, 10, 0] }
    else if (int == 6) { return ["Careful", 0, 0, 0, -10, 10, 0] }
    else if (int == 7) { return ["Docile", 0, 0, 0, 0, 0, 0] }
    else if (int == 8) { return ["Gentle", 0, 0, -10, 0, 10, 0] }
    else if (int == 9) { return ["Hardy", 0, 0, 0, 0, 0, 0] }
    else if (int == 10) { return ["Hasty", 0, 0, -10, 0, 0, 10] }
    else if (int == 11) { return ["Impish", 0, 0, 10, -10, 0, 0] }
    else if (int == 12) { return ["Jolly", 0, 0, 0, -10, 0, 10] }
    else if (int == 13) { return ["Lax", 0, 10, 0, 0, -10, 0] }
    else if (int == 14) { return ["Lonely", 0, 10, -10, 0, 0, 0] }
    else if (int == 15) { return ["Mild", 0, 0, -10, 10, 0, 0] }
    else if (int == 16) { return ["Modest", 0, 0, 0, 10, 0, -10] }
    else if (int == 17) { return ["Naive", 0, 0, 0, 0, -10, 10] }
    else if (int == 18) { return ["Naughty", 0, 10, 0, 0, -10, 0] }
    else if (int == 19) { return ["Quiet", 0, 0, 0, 10, 0, -10] }
    else if (int == 20) { return ["Quirky", 0, 0, 0, 0, 0, 0] }
    else if (int == 21) { return ["Rash", 0, 0, 0, 10, -10, 0] }
    else if (int == 22) { return ["Relaxed", 0, 0, 10, 0, 0, -10] }
    else if (int == 23) { return ["Sassy", 0, 0, 0, 0, 10, -10] }
    else if (int == 24) { return ["Serious", 0, 0, 0, 0, 0, 0] }
    else if (int == 25) { return ["Timid", 0, -10, 0, 0, 0, 10] }
}

// Percentage calculation.
function percentage(percent, total) {
    return parseInt(((percent / 100) * total).toFixed(0));
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

// Function to return random integer
function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports.config = {
    name: "raid",
    aliases: []
}