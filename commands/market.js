const Discord = require('discord.js'); // For Embedded Message.
const _ = require('lodash');
const floor = require('lodash/floor');

// Models
const user_model = require('../models/user');
const market_model = require('../models/market');
const prompt_model = require('../models/prompt');

// Utils
const getPokemons = require('../utils/getPokemon');
const pagination = require('../utils/pagination');

module.exports.run = async (bot, message, args, prefix, user_available, pokemons, cmd) => {
    if (!user_available) { message.channel.send(`You should have started to use this command! Use ${prefix}start to begin the journey!`); return; }

    //Get user data.
    user_model.findOne({ UserID: message.author.id }, (err, user) => {
        if (!user) return;
        if (err) console.log(err);

        // Convert all args to lowercase.
        args = args.map(arg => arg.toLowerCase());

        // For only market command
        if (args.length == 0) {
            return message.channel.send("Invalid Syntax. Use " + prefix + "help to know about market commands.");
        }

        // For market list command
        if (args[0] == "list" && args.length == 3) {
            getPokemons.getallpokemon(message.author.id).then(user_pokemons => {

                if (!isInt(args[2])) return message.channel.send("When listing on a market, you must specify a price.");
                if (args[2] < 1) return message.channel.send("Isn't that too low for a pokémon ? Minimum price is 1.");
                if (args[2] > 1000000000) return message.channel.send("Isn't that too high for a pokémon ? Maximum price is 1,000,000,000.");

                // If arguments is latest or l
                if (args[1].toLowerCase() == "l" || args[1].toLowerCase() == "latest") var selected_pokemon = user_pokemons[user_pokemons.length - 1];
                // If arguments is number
                else if (isInt(args[1])) {
                    if (typeof user_pokemons[args[1] - 1] != 'undefined') var selected_pokemon = user_pokemons[args[1] - 1];
                    else return message.channel.send("No pokémon exists with that number.");
                }
                else return message.channel.send("Please type a valid pokémon number.");

                var pokemon_name = getPokemons.get_pokemon_name_from_id(selected_pokemon.PokemonId, pokemons, selected_pokemon.Shiny);

                prompt_model.findOne({ $and: [{ $or: [{ "UserID.User1ID": message.author.id }, { "UserID.User2ID": message.author.id }] }, { $or: [{ "Trade.Accepted": true }, { "Duel.Accepted": true }] }] }, (err, _data) => {
                    if (err) return console.log(err);
                    if (_data) return message.channel.send("You can't add market listing now!");

                    var update_data = new prompt_model({
                        ChannelID: message.channel.id,
                        PromptType: "ConfirmList",
                        UserID: {
                            User1ID: message.author.id
                        },
                        List: {
                            PokemonUID: selected_pokemon._id,
                            Price: args[2]
                        }
                    });

                    var tax_price = [];
                    if (args[2] > 1000 && args[2] <= 10000) tax_price = ["1,000", 1.5, percentCalculation(args[2], 1.5).toFixed(0)];
                    else if (args[2] > 10000 && args[2] <= 100000) tax_price = ["10,000", 3, percentCalculation(args[2], 3).toFixed(0)]
                    else if (args[2] > 100000 && args[2] <= 1000000) tax_price = ["1,00,000", 4.5, percentCalculation(args[2], 4.5).toFixed(0)];
                    else if (args[2] > 1000000) tax_price = ["1,000,000", 6, percentCalculation(args[2], 6).toFixed(0)];

                    update_data.save().then(result => {
                        return message.channel.send(`Are you sure you want to list your level ${selected_pokemon.Level} ${pokemon_name}${selected_pokemon.Shiny == true ? " :star:" : ""} on the market for ${args[2]} Credits?${tax_price.length > 0 ? ` _As your pokémon will be listed for over ${tax_price[0]} credits, ${tax_price[1]}% will be taken on sale and you will receive ${args[2] - tax_price[2]} credits._\n` : ""} Type \`\`${prefix}confirmlist\`\` to confirm or \`\`${prefix}cancel\`\` to cancel the listing.`);
                    });
                });
            });
        }

        // For view or info pokemon command  
        else if ((args[0] == "view" || args[0] == "info" || args[0] == "i") && args.length == 2) {
            if (!isInt(args[1])) return message.channel.send("Please type a valid pokémon ID.");

            market_model.findOne({ "MarketID": args[1] }, (err, market) => {
                if (!market) return message.channel.send("No pokémon exists with that ID.");
                else {
                    var pokemon_db = pokemons.filter(it => it["Pokemon Id"] == market.PokemonId)[0];

                    //Get Pokemon Name from Pokemon ID.
                    var pokemon_name = getPokemons.get_pokemon_name_from_id(market.PokemonId, pokemons, market.Shiny, true);

                    let exp = market.Experience;
                    let level = market.Level;
                    let hp_iv = market.IV[0];
                    let atk_iv = market.IV[1];
                    let def_iv = market.IV[2];
                    let spa_iv = market.IV[3];
                    let spd_iv = market.IV[4];
                    let spe_iv = market.IV[5];
                    let nature = market.NatureValue;
                    let shiny = market.Shiny;

                    // Evs
                    var ev_available = false;
                    var EV = [0, 0, 0, 0, 0, 0];
                    if (market.EV != undefined &&  market.EV.length > 0) {
                        ev_available = true;
                        let hp_ev = market.EV[0];
                        let atk_ev = market.EV[1];
                        let def_ev = market.EV[2];
                        let spa_ev = market.EV[3];
                        let spd_ev = market.EV[4];
                        let spe_ev = market.EV[5];
                        EV = [hp_ev, atk_ev, def_ev, spa_ev, spd_ev, spe_ev];
                    }

                    let description = `${exp}/${exp_to_level(level)}XP`;
                    var type = "";
                    if (pokemon_db["Secondary Type"] != "NULL") { type = pokemon_db["Primary Type"] + " | " + pokemon_db["Secondary Type"] }
                    else { type = pokemon_db["Primary Type"]; }
                    let nature_name = nature_of(nature)[0];
                    let hp = floor(0.01 * (2 * pokemon_db["Health Stat"] + hp_iv + floor(0.25 * EV[0])) * level) + level + 10;
                    let atk = (floor(0.01 * (2 * pokemon_db["Attack Stat"] + atk_iv + floor(0.25 * EV[1])) * level) + 5);
                    let def = (floor(0.01 * (2 * pokemon_db["Defense Stat"] + def_iv + floor(0.25 * EV[2])) * level) + 5);
                    let spa = (floor(0.01 * (2 * pokemon_db["Special Attack Stat"] + spa_iv + floor(0.25 * EV[3])) * level) + 5);
                    let spd = (floor(0.01 * (2 * pokemon_db["Special Defense Stat"] + spd_iv + floor(0.25 * EV[4])) * level) + 5);
                    let spe = (floor(0.01 * (2 * pokemon_db["Speed Stat"] + spe_iv + floor(0.25 * EV[5])) * level) + 5);
                    let total_iv = ((hp_iv + atk_iv + def_iv + spa_iv + spd_iv + spe_iv) / 186 * 100).toFixed(2);

                    // Nature Change
                    var nature_value = nature_of(nature);
                    hp += percentage(hp, nature_value[1]);
                    atk += percentage(atk, nature_value[2]);
                    def += percentage(def, nature_value[3]);
                    spa += percentage(spa, nature_value[4]);
                    spd += percentage(spd, nature_value[5]);
                    spe += percentage(spe, nature_value[6]);

                    // Image url
                    var form = pokemon_db["Alternate Form Name"];
                    var str = "" + pokemon_db["Pokedex Number"];
                    var pad = "000"
                    var pokedex_num = pad.substring(0, pad.length - str.length) + str;
                    if (form == "NULL") { form = ""; }
                    if (form == "" && shiny) { var image_name = pokedex_num + '-Shiny.png'; }
                    else if (form == "" && !shiny) { var image_name = pokedex_num + '.png'; }
                    else if (form != "" && shiny) { var image_name = pokedex_num + '-' + form.replace(" ", "-") + '-Shiny.png'; }
                    else if (form != "" && !shiny) { var image_name = pokedex_num + '-' + form.replace(" ", "-") + '.png'; }
                    else { var image_name = pokedex_num + '-' + form.replace(" ", "-") + '.png'; }
                    var image_url = './assets/images/' + image_name.replace("%", "");
                    var held_item = market.Held != undefined ? `**\n_Holding: ${market.Held}_**` : "";

                    var embed = new Discord.MessageEmbed();
                    embed.attachFiles(image_url)
                    embed.setTitle(`Level ${market.Level} ${pokemon_name} - ID: ${market.MarketID} - Price: ${market.Price}`);
                    embed.setColor(message.member.displayHexColor);
                    embed.setDescription(description +
                        `\n**Type**: ${type}` + held_item +
                        `\n**Nature**: ${nature_name}` +
                        `\n**HP**: ${hp} - IV ${hp_iv}/31 ${ev_available ? "- EV: " + EV[0] : ""}` +
                        `\n**Attack**: ${atk} - IV ${atk_iv}/31 ${ev_available ? "- EV: " + EV[1] : ""}` +
                        `\n**Defense**: ${def} - IV ${def_iv}/31 ${ev_available ? "- EV: " + EV[2] : ""}` +
                        `\n**Sp. Atk**: ${spa} - IV ${spa_iv}/31 ${ev_available ? "- EV: " + EV[3] : ""}` +
                        `\n**Sp. Def**: ${spd} - IV ${spd_iv}/31 ${ev_available ? "- EV: " + EV[4] : ""}` +
                        `\n**Speed**: ${spe} - IV ${spe_iv}/31 ${ev_available ? "- EV: " + EV[5] : ""}` +
                        `\n**Total IV**: ${total_iv}%`);
                    embed.setImage('attachment://' + image_name.replace("%", ""))
                    embed.setFooter(`To buy this pokemon, type ${prefix}market buy ${market.MarketID}`);
                    message.channel.send(embed)
                }
            });
        }
        // For market buy command
        else if (args[0] == "buy" && args.length == 2 && isInt(args[1])) {
            market_model.findOne({ "MarketID": args[1] }, (err, market) => {
                if (market == undefined || market == null || !market || market.length == 0) {
                    return message.channel.send("We couldn't find any pokémon associted with that market ID.");
                }
                else if (market.UserID == message.author.id) return message.channel.send("You can't buy your own pokemon.");
                else {
                    if (market.Price > user.PokeCredits) return message.channel.send("You don't have enough pokecredits to buy this pokemon.");
                    var update_data = new prompt_model({
                        ChannelID: message.channel.id,
                        PromptType: "ConfirmBuy",
                        UserID: {
                            User1ID: message.author.id
                        },
                        List: {
                            PokemonUID: market.PokemonUID,
                            MarketID: market.MarketID
                        }
                    });
                    update_data.save().then(() => {
                        return message.channel.send(`Are you sure you want to buy level ${market.Level} ${market.PokemonName}${market.Shiny == true ? " :star:" : ""} from market? Type \`\`${prefix}confirmbuy\`\` to confirm or \`\`${prefix}cancel\`\` to cancel the stop buying.`);
                    });
                }
            });
        }
        // For market remove command
        else if ((args[0] == "remove" || args[0] == "rem") && args.length == 2 && isInt(args[1])) {
            market_model.findOne({ $and: [{ "UserID": message.author.id }, { "MarketID": args[1] }] }, (err, market) => {
                if (market == undefined || market == null || !market || market.length == 0) {
                    return message.channel.send("We couldn't find any pokémon associted with that market ID.");
                }
                else {
                    var update_data = new prompt_model({
                        ChannelID: message.channel.id,
                        PromptType: "ConfirmRemove",
                        UserID: {
                            User1ID: message.author.id
                        },
                        List: {
                            PokemonUID: market.PokemonUID,
                            MarketID: market.MarketID
                        }
                    });
                    update_data.save().then(() => {
                        return message.channel.send(`Are you sure you want to remove your level ${market.Level} ${market.PokemonName}${market.Shiny == true ? " :star:" : ""} from market? Type \`\`${prefix}confirmremove\`\` to confirm or \`\`${prefix}cancel\`\` to cancel the removing.`);
                    });
                }
            });
        }
        // For market listings command
        else if (args[0] == "listings" || args[0] == "lis") {
            return arg_parsing(message, args, prefix, "listings", pokemons)
        }
        // For market search command.
        else if (args[0] == "search" || args[0] == "s") {
            return arg_parsing(message, args, prefix, "search", pokemons);
        }
        else return message.channel.send("Invalid command. Type `" + prefix + "help` for a list of commands.");
    });
}

// Function for arg parsing and understanding.
function arg_parsing(message, args, prefix, command, pokemons) {
    var showiv = false;
    var request_query = [];
    args.shift(); // Remove search from args.
    var order_type = {};

    var all_search_types = ["--o", "--order", "--showiv", "a", "d", "asc", "ascending", "desc", "descending", "iv", "id", "level", "lvl", "name", "n", "price", "p"];
    if (args.every(r => all_search_types.indexOf(r.toLowerCase()) >= 0)) {
        if (args.includes("--showiv")) {
            // Remove --showiv from args.
            args = args.filter(arg => arg != "--showiv");
            showiv = true;
        }

        var order_arrange = "asc";
        if (Object.keys(order_type).length != 0) return error[1] = [false, "You can only use order command once."];
        if (args.length == 3 && (args[2] == "asc" || args[2] == "ascending" || args[2] == 'a')) order_arrange = "asc";
        if (args.length == 3 && (args[2] == "desc" || args[2] == "descending" || args[2] == 'd')) order_arrange = "desc";
        if (args[1] != undefined && (args[1].toLowerCase() == "iv")) { order_type = { 'IVPercentage': order_arrange } }
        else if (args[1] != undefined && (args[1].toLowerCase() == "id")) { order_type = { 'MarketID': order_arrange } }
        else if (args[1] != undefined && (args[1].toLowerCase() == "level" || args[1].toLowerCase() == "lvl" || args[1].toLowerCase() == "l")) { order_type = { 'Level': order_arrange } }
        else if (args[1] != undefined && (args[1].toLowerCase() == "name" || args[1].toLowerCase() == "n")) { order_type = { 'PokemonName': order_arrange } }
        else if (args[1] != undefined && (args[1].toLowerCase() == "price" || args[1].toLowerCase() == "p")) { order_type = { 'Price': order_arrange } }

        if (command == "search") {
            market_model.find({ "Primary": undefined }).sort(order_type).exec((err, market) => {
                if (market == undefined || market == null || !market || market.length == 0) {
                    return message.channel.send("No market listings found.");
                } else {
                    var temp_counter = 0;
                    var tot_len = market.length;
                    var split_chunks = spliceIntoChunks(market, 20);
                    var embeds = [];
                    var current_index = 0;
                    for (i = 0; i < split_chunks.length; i++) {
                        embeds[i] = new Discord.MessageEmbed();
                        embeds[i].setTitle("PokéFort Market:");
                        var description = "";
                        temp_counter += split_chunks[i].length;
                        for (j = 0; j < split_chunks[i].length; j++) {
                            current_index = temp_counter - split_chunks[i].length + 1;
                            description += `Level ${split_chunks[i][j]["Level"]} ${split_chunks[i][j]["PokemonName"]}${split_chunks[i][j].Shiny == true ? " :star:" : ""} | ID: ${split_chunks[i][j]["MarketID"]}${showiv == true ? ` | IV: ${split_chunks[i][j].IVPercentage}% ` : ``} | Price: ${split_chunks[i][j]["Price"]} Credits\n`;
                        }
                        embeds[i].setDescription(description);
                        embeds[i].setFooter(`Page: ${i + 1}/${split_chunks.length} Showing ${current_index} to ${(current_index - 1) + split_chunks[i].length} out of ${tot_len}`);
                    }
                    message.channel.send(embeds[0]).then(msg => {
                        if (split_chunks.length > 1) return pagination.createpage(message.channel.id, message.author.id, msg.id, embeds, 0);
                        else return;
                    });
                }
            });
        }
        else if (command == "listings") {
            market_model.find({ "UserID": message.author.id }).sort(order_type).exec((err, market) => {
                if (market == undefined || market == null || !market || market.length == 0) {
                    return message.channel.send("No market listings found.");
                } else {
                    var temp_counter = 0;
                    var tot_len = market.length;
                    var split_chunks = spliceIntoChunks(market, 20);
                    var embeds = [];
                    var current_index = 0;
                    for (i = 0; i < split_chunks.length; i++) {
                        embeds[i] = new Discord.MessageEmbed();
                        embeds[i].setTitle("Your Market Listings:");
                        var description = "";
                        temp_counter += split_chunks[i].length;
                        for (j = 0; j < split_chunks[i].length; j++) {
                            current_index = temp_counter - split_chunks[i].length + 1;
                            description += `Level ${split_chunks[i][j]["Level"]} ${split_chunks[i][j]["PokemonName"]}${split_chunks[i][j].Shiny == true ? " :star:" : ""} | ID: ${split_chunks[i][j]["MarketID"]}${showiv == true ? ` | IV: ${split_chunks[i][j].IVPercentage}% ` : ``} | Price: ${split_chunks[i][j]["Price"]} Credits\n`;
                        }
                        embeds[i].setDescription(description);
                        embeds[i].setFooter(`Page: ${i + 1}/${split_chunks.length} Showing ${current_index} to ${(current_index - 1) + split_chunks[i].length} out of ${tot_len}`);
                    }
                    message.channel.send(embeds[0]).then(msg => {
                        if (split_chunks.length > 1) return pagination.createpage(message.channel.id, message.author.id, msg.id, embeds, 0);
                        else return;
                    });
                }
            });
        }
    }
    else {
        // Multi commmand controller.
        var error = [];
        var total_args = args.join(" ").replace(/--/g, ",--").split(",");
        total_args = _.without(total_args, "", " ");
        for (j = 0; j < total_args.length; j++) {
            new_args = total_args[j].split(" ").filter(it => it != "");
            error[0] = new_args[0];
            if (new_args.length == 1 && (_.isEqual(new_args[0], "--s") || _.isEqual(new_args[0], "--shiny"))) { shiny(new_args); }
            else if (new_args.length == 1 && _.isEqual(new_args[0], "--showiv")) { show_iv(new_args); }
            else if (new_args.length == 2 && (_.isEqual(new_args[0], "--t") || _.isEqual(new_args[0], "--type"))) { type(new_args); }
            else if (new_args.length >= 1 && (_.isEqual(new_args[0], "--n") || _.isEqual(new_args[0], "--name"))) { name(new_args); }
            else if (new_args.length >= 1 && (_.isEqual(new_args[0], "--h") || _.isEqual(new_args[0], "--held"))) { held(new_args); }
            else if (new_args.length == 1 && (_.isEqual(new_args[0], "--l") || _.isEqual(new_args[0], "--legendary"))) { legendary(new_args); }
            else if (new_args.length == 1 && (_.isEqual(new_args[0], "--m") || _.isEqual(new_args[0], "--mythical"))) { mythical(new_args); }
            else if (new_args.length == 1 && (_.isEqual(new_args[0], "--ub") || _.isEqual(new_args[0], "--ultrabeast"))) { ultrabeast(new_args); }
            else if (new_args.length == 1 && (_.isEqual(new_args[0], "--a") || _.isEqual(new_args[0], "--alolan"))) { alolan(new_args); }
            else if (new_args.length == 1 && (_.isEqual(new_args[0], "--h") || _.isEqual(new_args[0], "--hisuian"))) { hisuian(new_args); }
            else if (new_args.length == 1 && (_.isEqual(new_args[0], "--g") || _.isEqual(new_args[0], "--galarian"))) { galarian(new_args); }
            else if (new_args.length == 1 && (_.isEqual(new_args[0], "--mega"))) { mega(new_args); }
            else if (new_args.length > 1 && (_.isEqual(new_args[0], "--lvl") || _.isEqual(new_args[0], "--level"))) { level(new_args); }
            else if (new_args.length > 1 && (_.isEqual(new_args[0], "--iv"))) { iv(new_args); }
            else if (new_args.length > 1 && (_.isEqual(new_args[0], "--hpiv"))) { hpiv(new_args); }
            else if (new_args.length > 1 && (_.isEqual(new_args[0], "--atkiv") || _.isEqual(new_args[0], "--attackiv"))) { atkiv(new_args); }
            else if (new_args.length > 1 && (_.isEqual(new_args[0], "--defiv") || _.isEqual(new_args[0], "--defenseiv"))) { defiv(new_args); }
            else if (new_args.length > 1 && (_.isEqual(new_args[0], "--spatkiv") || _.isEqual(new_args[0], "--specialattackiv"))) { spatkiv(new_args); }
            else if (new_args.length > 1 && (_.isEqual(new_args[0], "--spdefiv") || _.isEqual(new_args[0], "--specialdefenseiv"))) { spdefiv(new_args); }
            else if (new_args.length > 1 && (_.isEqual(new_args[0], "--spdiv") || _.isEqual(new_args[0], "--speediv"))) { spdiv(new_args); }
            else if (new_args.length >= 2 && new_args.length < 4 && (_.isEqual(new_args[0], "--order") || _.isEqual(new_args[0], "--o"))) { order(new_args); }
            else { message.channel.send("Invalid command."); return; }

            // Check if error occurred in previous loop
            if (error.length > 1) {
                message.channel.send(`Error: Argument ${'``' + error[0] + '``'} says ${error[1][1]}`);
                break;
            }
            if (j == total_args.length - 1) {
                if (command == "listings") {
                    request_query.unshift({ "UserID": message.author.id });
                    market_model.find({ $and: request_query }).sort(order_type).exec((err, market) => {
                        if (market == undefined || market == null || !market || market.length == 0) {
                            return message.channel.send("No market listings found for your search.");
                        } else {
                            var temp_counter = 0;
                            var tot_len = market.length;
                            var split_chunks = spliceIntoChunks(market, 20);
                            var embeds = [];
                            var current_index = 0;
                            for (i = 0; i < split_chunks.length; i++) {
                                embeds[i] = new Discord.MessageEmbed();
                                embeds[i].setTitle("Your Market Listings:");
                                var description = "";
                                temp_counter += split_chunks[i].length;
                                for (j = 0; j < split_chunks[i].length; j++) {
                                    current_index = temp_counter - split_chunks[i].length + 1;
                                    description += `Level ${split_chunks[i][j]["Level"]} ${split_chunks[i][j]["PokemonName"]}${split_chunks[i][j].Shiny == true ? " :star:" : ""} | ID: ${split_chunks[i][j]["MarketID"]}${showiv == true ? ` | IV: ${split_chunks[i][j].IVPercentage}% ` : ``} | Price: ${split_chunks[i][j]["Price"]} Credits\n`;
                                }
                                embeds[i].setDescription(description);
                                embeds[i].setFooter(`Page: ${i + 1}/${split_chunks.length} Showing ${current_index} to ${(current_index - 1) + split_chunks[i].length} out of ${tot_len}`);
                            }
                            message.channel.send(embeds[0]).then(msg => {
                                if (split_chunks.length > 1) return pagination.createpage(message.channel.id, message.author.id, msg.id, embeds, 0);
                                else return;
                            });
                        }
                    });
                }
                else {
                    market_model.find({ $and: request_query }).sort(order_type).exec((err, market) => {
                        if (market == undefined || market == null || !market || market.length == 0) {
                            return message.channel.send("No market listings found for your search.");
                        } else {
                            var temp_counter = 0;
                            var tot_len = market.length;
                            var split_chunks = spliceIntoChunks(market, 20);
                            var embeds = [];
                            var current_index = 0;
                            for (i = 0; i < split_chunks.length; i++) {
                                embeds[i] = new Discord.MessageEmbed();
                                embeds[i].setTitle("PokéFort Market:");
                                var description = "";
                                temp_counter += split_chunks[i].length;
                                for (j = 0; j < split_chunks[i].length; j++) {
                                    current_index = temp_counter - split_chunks[i].length + 1;
                                    description += `Level ${split_chunks[i][j]["Level"]} ${split_chunks[i][j]["PokemonName"]}${split_chunks[i][j].Shiny == true ? " :star:" : ""} | ID: ${split_chunks[i][j]["MarketID"]}${showiv == true ? ` | IV: ${split_chunks[i][j].IVPercentage}% ` : ``} | Price: ${split_chunks[i][j]["Price"]} Credits\n`;
                                }
                                embeds[i].setDescription(description);
                                embeds[i].setFooter(`Page: ${i + 1}/${split_chunks.length} Showing ${current_index} to ${(current_index - 1) + split_chunks[i].length} out of ${tot_len}`);
                            }
                            message.channel.send(embeds[0]).then(msg => {
                                if (split_chunks.length > 1) return pagination.createpage(message.channel.id, message.author.id, msg.id, embeds, 0);
                                else return;
                            });
                        }
                    });
                }
            }
        }

        // For market --shiny command.
        function shiny(args) {
            request_query.push({ "Shiny": true });
        }

        // For market --showiv command.
        function show_iv(args) {
            showiv = true;
        }

        // For market --type command.
        function type(args) {
            request_query.push({ "Type": { $regex: new RegExp(`^${args[1]}`, 'i') } });
        }

        // For market --name command.
        function name(args) {
            const [, ...name] = args;
            request_query.push({ "PokemonName": { $regex: new RegExp(`^${name.join(" ")}`, 'i') } });
        }

        // For market --held command.
        function held(args) {
            const [, ...name] = args;
            request_query.push({ "Held": { $regex: new RegExp(`^${name.join(" ")}`, 'i') } });
        }

        // For auction --legendary command.
        function legendary() {
            var legendaries = pokemons.filter(it => it["Legendary Type"] === "Legendary" || it["Legendary Type"] === "Sub-Legendary" && it["Alternate Form Name"] === "NULL" && it["Primary Ability"] != "Beast Boost");
            var legend_list = [];
            for (var i = 0; i < legendaries.length; i++) {
                legend_list.push(legendaries[i]["Pokemon Id"]);
            }
            request_query.push({ "PokemonId": { $in: legend_list } });
        }

        // For auction --mythical command.
        function mythical() {
            var mythicals = pokemons.filter(it => it["Legendary Type"] === "Mythical" && it["Alternate Form Name"] === "NULL");
            var myth_list = [];
            for (var i = 0; i < mythicals.length; i++) {
                myth_list.push(mythicals[i]["Pokemon Id"]);
            }
            request_query.push({ "PokemonId": { $in: myth_list } });
        }

        // For auction --ultrabeast command.
        function ultrabeast() {
            var ultrabeasts = pokemons.filter(it => it["Legendary Type"] === "Ultra Beast" && it["Alternate Form Name"] === "NULL");
            var ultra_list = [];
            for (var i = 0; i < ultrabeasts.length; i++) {
                ultra_list.push(ultrabeasts[i]["Pokemon Id"]);
            }
            request_query.push({ "PokemonId": { $in: ultra_list } });
        }

        // For auction --alolan command.
        function alolan() {
            var alolans = pokemons.filter(it => it["Alternate Form Name"] === "Alola");
            var alolan_list = [];
            for (var i = 0; i < alolans.length; i++) {
                alolan_list.push(alolans[i]["Pokemon Id"]);
            }
            request_query.push({ "PokemonId": { $in: alolan_list } });
        }

        // For auction --hisuian command.
        function hisuian() {
            var hisuian = pokemons.filter(it => it["Alternate Form Name"] === "Hisuian");
            var hisuian_list = [];
            for (var i = 0; i < hisuian.length; i++) {
                hisuian_list.push(hisuian[i]["Pokemon Id"]);
            }
            request_query.push({ "PokemonId": { $in: hisuian_list } });
        }

        // For auction --galarian command.
        function galarian() {
            var galarians = pokemons.filter(it => it["Alternate Form Name"] === "Galar");
            var galarian_list = [];
            for (var i = 0; i < galarians.length; i++) {
                galarian_list.push(galarians[i]["Pokemon Id"]);
            }
            request_query.push({ "PokemonId": { $in: galarian_list } });
        }

        // For auction --mega command.
        function mega() {
            var megas = pokemons.filter(it => it["Alternate Form Name"] === "Mega" || it["Alternate Form Name"] === "Mega X" || it["Alternate Form Name"] === "Mega Y");
            var mega_list = [];
            for (var i = 0; i < megas.length; i++) {
                mega_list.push(megas[i]["Pokemon Id"]);
            }
            request_query.push({ "PokemonId": { $in: mega_list } });
        }

        // For market --level command.
        function level(args) {
            if (args.length == 1) {
                return error[1] = [false, "Please specify a value."]
            }
            else if (args.length == 2 && isInt(args[1])) {
                request_query.push({ "Level": parseInt(args[1]) });
            }
            else if (args.length == 3 && args[1] == ">" && isInt(args[2])) {
                request_query.push({ "Level": { $gt: parseInt(args[2]) } });
            }
            else if (args.length == 3 && args[1] == "<" && isInt(args[2])) {
                request_query.push({ "Level": { $lt: parseInt(args[2]) } });
            }
            else { return error[1] = [false, "Invalid argument syntax."] }
        }

        // For market --iv command.
        function iv(args) {
            if (args.length == 1) {
                return error[1] = [false, "Please specify a value."]
            }
            else if (args.length == 2 && isInt(args[1]) || isFloat(parseFloat(args[1]))) {
                request_query.push({ "IVPercentage": parseFloat(args[1]) });
            }
            else if (args.length == 3 && args[1] == ">" && (isInt(args[2]) || isFloat(parseFloat(args[2])))) {
                request_query.push({ "IVPercentage": { $gt: parseFloat(args[2]) } });
            }
            else if (args.length == 3 && args[1] == "<" && (isInt(args[2]) || isFloat(parseFloat(args[2])))) {
                request_query.push({ "IVPercentage": { $lt: parseFloat(args[2]) } });
            }
            else { return error[1] = [false, "Invalid argument syntax."] }
        }

        // For market --hpiv command.
        function hpiv(args) {
            if (args.length == 1) {
                return error[1] = [false, "Please specify a value."]
            }
            else if (args.length == 2 && isInt(args[1])) {
                request_query.push({ "IV.0": parseInt(args[1]) });
            }
            else if (args.length == 3 && args[1] == ">" && isInt(args[2])) {
                request_query.push({ "IV.0": { $gt: parseInt(args[2]) } });
            }
            else if (args.length == 3 && args[1] == "<" && isInt(args[2])) {
                request_query.push({ "IV.0": { $lt: parseInt(args[2]) } });
            }
            else { return error[1] = [false, "Invalid argument syntax."] }
        }

        // For market --atkiv command.
        function atkiv(args) {
            if (args.length == 1) {
                return error[1] = [false, "Please specify a value."]
            }
            else if (args.length == 2 && isInt(args[1])) {
                request_query.push({ "IV.1": parseInt(args[1]) });
            }
            else if (args.length == 3 && args[1] == ">" && isInt(args[2])) {
                request_query.push({ "IV.1": { $gt: parseInt(args[2]) } });
            }
            else if (args.length == 3 && args[1] == "<" && isInt(args[2])) {
                request_query.push({ "IV.1": { $lt: parseInt(args[2]) } });
            }
            else { return error[1] = [false, "Invalid argument syntax."] }
        }

        // For market --defiv command.
        function defiv(args) {
            if (args.length == 1) {
                return error[1] = [false, "Please specify a value."]
            }
            else if (args.length == 2 && isInt(args[1])) {
                request_query.push({ "IV.2": parseInt(args[1]) });
            }
            else if (args.length == 3 && args[1] == ">" && isInt(args[2])) {
                request_query.push({ "IV.2": { $gt: parseInt(args[2]) } });
            }
            else if (args.length == 3 && args[1] == "<" && isInt(args[2])) {
                request_query.push({ "IV.2": { $lt: parseInt(args[2]) } });
            }
            else { return error[1] = [false, "Invalid argument syntax."] }
        }

        // For market --spatkiv command.
        function spatkiv(args) {
            if (args.length == 1) {
                return error[1] = [false, "Please specify a value."]
            }
            else if (args.length == 2 && isInt(args[1])) {
                request_query.push({ "IV.3": parseInt(args[1]) });
            }
            else if (args.length == 3 && args[1] == ">" && isInt(args[2])) {
                request_query.push({ "IV.3": { $gt: parseInt(args[2]) } });
            }
            else if (args.length == 3 && args[1] == "<" && isInt(args[2])) {
                request_query.push({ "IV.3": { $lt: parseInt(args[2]) } });
            }
            else { return error[1] = [false, "Invalid argument syntax."] }
        }

        // For market --spdefiv command.
        function spdefiv(args) {
            if (args.length == 1) {
                return error[1] = [false, "Please specify a value."]
            }
            else if (args.length == 2 && isInt(args[1])) {
                request_query.push({ "IV.4": parseInt(args[1]) });
            }
            else if (args.length == 3 && args[1] == ">" && isInt(args[2])) {
                request_query.push({ "IV.4": { $gt: parseInt(args[2]) } });
            }
            else if (args.length == 3 && args[1] == "<" && isInt(args[2])) {
                request_query.push({ "IV.4": { $lt: parseInt(args[2]) } });
            }
            else { return error[1] = [false, "Invalid argument syntax."] }
        }

        // For market --speediv command.
        function spdiv(args) {
            if (args.length == 1) {
                return error[1] = [false, "Please specify a value."]
            }
            else if (args.length == 2 && isInt(args[1])) {
                request_query.push({ "IV.5": parseInt(args[1]) });
            }
            else if (args.length == 3 && args[1] == ">" && isInt(args[2])) {
                request_query.push({ "IV.5": { $gt: parseInt(args[2]) } });
            }
            else if (args.length == 3 && args[1] == "<" && isInt(args[2])) {
                request_query.push({ "IV.5": { $lt: parseInt(args[2]) } });
            }
            else { return error[1] = [false, "Invalid argument syntax."] }
        }

        // For market --order command.
        function order(args) {
            var order_arrange = "asc";
            if (Object.keys(order_type).length != 0) return error[1] = [false, "You can only use order command once."];
            if (args.length == 3 && (args[2] == "asc" || args[2] == "ascending" || args[2] == 'a')) order_arrange = "asc";
            if (args.length == 3 && (args[2] == "desc" || args[2] == "descending" || args[2] == 'd')) order_arrange = "desc";
            if (args[1].toLowerCase() == "iv") { order_type = { "IVPercentage": order_arrange } }
            else if (args[1].toLowerCase() == "id") { order_type = { "MarketID": order_arrange } }
            else if (args[1].toLowerCase() == "level" || args[1].toLowerCase() == "lvl" || args[1].toLowerCase() == "l") { order_type = { "Level": order_arrange } }
            else if (args[1].toLowerCase() == "name" || args[1].toLowerCase() == "n") { order_type = { "PokemonName": order_arrange } }
            else if (args[1].toLowerCase() == "price" || args[1].toLowerCase() == "p") { order_type = { "Price": order_arrange } }
            else { return error[1] = [false, "Invalid argument syntax."] }
        }
    }
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

// Function to chunk given data.
function spliceIntoChunks(arr, chunkSize) {
    const res = [];
    while (arr.length > 0) {
        const chunk = arr.splice(0, chunkSize);
        res.push(chunk);
    }
    return res;
}

// Calculate percentage of given number.
function percentCalculation(a, b) {
    var c = (parseFloat(a) * parseFloat(b)) / 100;
    return parseFloat(c);
}

// Percentage calculation.
function percentage(percent, total) {
    return parseInt(((percent / 100) * total).toFixed(0));
}

// Calculate total iv from iv array.
function total_iv(iv) {
    var total_iv = ((iv[0] + iv[1] + iv[2] + iv[3] + iv[4] + iv[5]) / 186 * 100).toFixed(2);
    return total_iv;
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

// Check if given value is float.
function isFloat(x) { return !!(x % 1); }

module.exports.config = {
    name: "market",
    aliases: []
}