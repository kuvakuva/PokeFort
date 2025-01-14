const Discord = require('discord.js');
const _ = require('lodash');
const floor = require('lodash/floor');

// Models
const user_model = require('../models/user');
const auction_model = require('../models/auction');
const prompt_model = require('../models/prompt');

// Utils
const getPokemons = require('../utils/getPokemon');
const pagination = require('../utils/pagination');

module.exports.run = async (bot, interaction, user_available, pokemons, cmd) => {
    if (!user_available) return interaction.reply({ content: `You should have started to use this command! Use /start to begin the journey!`, ephemeral: true });

    //Get user data.
    user_model.findOne({ UserID: interaction.user.id }, (err, user) => {
        if (!user) return;
        if (err) console.log(err);

        // For auction list command
        if (interaction.options.getSubcommand() === "list") {
            getPokemons.getallpokemon(interaction.user.id).then(user_pokemons => {

                var list_id = interaction.options.get("id").value;
                var list_buyout = interaction.options.get("buyout").value;
                var list_time = interaction.options.get("time").value;

                if (list_time[list_time.length - 1] != "h" && list_time[list_time.length - 1] != "m") return interaction.reply({ content: "Invalid Syntax. Use /help to know about auction commands.", ephemeral: true });
                if (!isInt(list_buyout)) return interaction.reply({ content: "When listing on a auction, you must specify a buyout.", ephemeral: true });
                if (list_buyout < 1) return interaction.reply({ content: "Isn't that too low for a pokémon ? Minimum buyout is 1.", ephemeral: true });
                if (list_buyout > 1000000000) return interaction.reply({ content: "Isn't that too high for a pokémon ? Maximum price is 1,000,000,000.", ephemeral: true });

                if (isInt(list_id)) {
                    if (typeof user_pokemons[list_id - 1] != 'undefined') var selected_pokemon = user_pokemons[list_id - 1];
                    else return interaction.reply({ content: "No pokémon exists with that number.", ephemeral: true });
                }
                else return interaction.reply({ content: "Please type a valid pokémon number.", ephemeral: true });

                var pokemon_name = getPokemons.get_pokemon_name_from_id(selected_pokemon.PokemonId, pokemons, selected_pokemon.Shiny);

                prompt_model.findOne({ $and: [{ $or: [{ "UserID.User1ID": interaction.user.id }, { "UserID.User2ID": interaction.user.id }] }, { $or: [{ "Trade.Accepted": true }, { "Duel.Accepted": true }] }] }, (err, _data) => {
                    if (err) return console.log(err);
                    if (_data) return interaction.reply({ content: "You can't add auction listing now!", ephemeral: true });

                    var listing_fee = 125;
                    if (list_time[list_time.length - 1] == "h") listing_fee = 125 + (parseInt(list_time) * 25);

                    var update_data = new prompt_model({
                        ChannelID: interaction.channel.id,
                        PromptType: "ConfirmList",
                        UserID: {
                            User1ID: interaction.user.id
                        },
                        List: {
                            PokemonUID: selected_pokemon._id,
                            Price: list_buyout,
                            BidTime: list_time,
                            ListingFees: listing_fee
                        }
                    });

                    update_data.save().then(result => {
                        var time_string = list_time[list_time.length - 1] == "h" ? "hours" : "minutes";
                        return interaction.reply({ content: `Are you sure you want to list your level ${selected_pokemon.Level} ${pokemon_name}${selected_pokemon.Shiny == true ? " :star:" : ""} on the auction for ${list_time.substring(0, list_time.length - 1)} ${time_string} with a buyout of ${list_buyout} Credits? A listing fee of ${listing_fee} credits will be deducted from your balance.\nType \`\`/confirmlist\`\` to confirm or \`\`/cancel\`\` to cancel the listing.` });
                    });
                });
            });
        }

        // For bids command
        else if (interaction.options.getSubcommand() === "bids") {
            auction_model.find({ $and: [{ BidUser: interaction.user.id }, { "BidTime": { $gt: new Date() } }] }, (err, auction) => {
                if (auction == undefined || auction == null || !auction || auction.length == 0) {
                    return interaction.reply({ content: "You don't have any bids at the moment.", ephemeral: true });
                } else {
                    var temp_counter = 0;
                    var tot_len = auction.length;
                    var split_chunks = spliceIntoChunks(auction, 20);
                    var embeds = [];
                    var current_index = 0;
                    for (i = 0; i < split_chunks.length; i++) {
                        embeds[i] = new Discord.EmbedBuilder();
                        embeds[i].setTitle("Your Auction Bids:");
                        var description = "";
                        temp_counter += split_chunks[i].length;
                        for (j = 0; j < split_chunks[i].length; j++) {
                            current_index = temp_counter - split_chunks[i].length + 1;
                            var bid_time = new Date(split_chunks[i][j].BidTime);
                            var time_left = new Date(bid_time.getTime() - new Date().getTime());
                            var time_left_string = `Left: ${time_left.getUTCHours() != 0 ? time_left.getUTCHours() + "h " : ""}${time_left.getUTCMinutes() != 0 ? time_left.getUTCMinutes() + "min" : ""}`;
                            description += `Level ${split_chunks[i][j]["Level"]} ${split_chunks[i][j]["PokemonName"]}${split_chunks[i][j].Shiny == true ? " :star:" : ""} | ID: ${split_chunks[i][j]["AuctionID"]} | Buyout: ${split_chunks[i][j]["BuyOut"]} Credits | Bid: ${split_chunks[i][j]["BidPrice"] != undefined ? split_chunks[i][j]["BidPrice"] : "None"} ${time_left.getUTCMinutes() < 10 ? "| :hourglass_flowing_sand:" : "| " + time_left_string}\n`;
                        }
                        embeds[i].setDescription(description);
                        embeds[i].setFooter({ text: `Page: ${i + 1}/${split_chunks.length} Showing ${current_index} to ${(current_index - 1) + split_chunks[i].length} out of ${tot_len}` });
                    }
                    interaction.reply({ embeds: [embeds[0]], fetchReply: true }).then(msg => {
                        if (split_chunks.length > 1) return pagination.createpage(interaction.channel.id, interaction.user.id, msg.id, embeds, 0);
                        else return;
                    });
                }
            });
        }

        // For view pokemon command
        else if (interaction.options.getSubcommand() === "view") {
            if (!isInt(interaction.options.get("id").value)) return interaction.reply({ content: "Please type a valid pokémon ID.", ephemeral: true });

            auction_model.findOne({ $and: [{ "AuctionID": interaction.options.get("id").value }, { "BidTime": { $gt: new Date() } }] }, (err, auction) => {
                if (!auction) return interaction.reply({ content: "No pokémon exists with that ID.", ephemeral: true });
                else {
                    var pokemon_db = pokemons.filter(it => it["Pokemon Id"] == auction.PokemonId)[0];

                    //Get Pokemon Name from Pokemon ID.
                    var pokemon_name = getPokemons.get_pokemon_name_from_id(auction.PokemonId, pokemons, auction.Shiny, true);

                    let exp = auction.Experience;
                    let level = auction.Level;
                    let hp_iv = auction.IV[0];
                    let atk_iv = auction.IV[1];
                    let def_iv = auction.IV[2];
                    let spa_iv = auction.IV[3];
                    let spd_iv = auction.IV[4];
                    let spe_iv = auction.IV[5];
                    let nature = auction.NatureValue;
                    let shiny = auction.Shiny;

                    // Evs
                    var ev_available = false;
                    var EV = [0, 0, 0, 0, 0, 0];
                    if (auction.EV != undefined && auction.EV.length > 0) {
                        ev_available = true;
                        let hp_ev = auction.EV[0];
                        let atk_ev = auction.EV[1];
                        let def_ev = auction.EV[2];
                        let spa_ev = auction.EV[3];
                        let spd_ev = auction.EV[4];
                        let spe_ev = auction.EV[5];
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
                    var held_item = auction.Held != undefined ? `**\n_Holding: ${auction.Held}_**` : "";

                    var bid_time = new Date(auction.BidTime);
                    var time_left = new Date(bid_time.getTime() - new Date().getTime());
                    var time_left_string = `:hourglass_flowing_sand: ${time_left.getUTCHours() != 0 ? time_left.getUTCHours() + " hours " : ""} ${time_left.getUTCMinutes() != 0 ? time_left.getUTCMinutes() + " minutes " : ""}`;

                    var embed = new Discord.EmbedBuilder();
                    embed.setTitle(`Level ${auction.Level} ${pokemon_name} - ID: ${auction.AuctionID}`);
                    embed.setColor(interaction.member.displayHexColor);
                    embed.setDescription(description +
                        `\n**Type**: ${type}` + held_item +
                        `\n**Nature**: ${nature_name}` +
                        `\n**HP**: ${hp} - IV ${hp_iv}/31 ${ev_available ? "- EV: " + EV[0] : ""}` +
                        `\n**Attack**: ${atk} - IV ${atk_iv}/31 ${ev_available ? "- EV: " + EV[1] : ""}` +
                        `\n**Defense**: ${def} - IV ${def_iv}/31 ${ev_available ? "- EV: " + EV[2] : ""}` +
                        `\n**Sp. Atk**: ${spa} - IV ${spa_iv}/31 ${ev_available ? "- EV: " + EV[3] : ""}` +
                        `\n**Sp. Def**: ${spd} - IV ${spd_iv}/31 ${ev_available ? "- EV: " + EV[4] : ""}` +
                        `\n**Speed**: ${spe} - IV ${spe_iv}/31 ${ev_available ? "- EV: " + EV[5] : ""}` +
                        `\n**Total IV**: ${total_iv}%` +
                        `\nCurrent Bid: ${auction.BidPrice == undefined ? "None" : auction.BidPrice} - ${time_left_string}` +
                        `\n**Buyout: ${auction.BuyOut} Credits**`);
                    embed.setImage('attachment://' + image_name.replace("%", ""))
                    embed.setFooter({ text: `To bid on this pokemon, place a bid ${auction.BidPrice == undefined ? "by" : `of credits more than ${auction.BidPrice} by`} typing "/auction bid ${auction.AuctionID} <bid>"` });
                    interaction.reply({ embeds: [embed], files: [image_url] })
                }
            });
        }

        // For auction bid command
        else if (interaction.options.getSubcommand() === "bid") {
            auction_model.findOne({ $and: [{ "AuctionID": interaction.options.get("id").value }, { "BidTime": { $gt: new Date() } }] }, (err, auction) => {
                if (auction == undefined || auction == null || !auction || auction.length == 0) {
                    return interaction.reply({ content: "We couldn't find any pokémon associted with that auction ID.", ephemeral: true });
                }
                else if (auction.UserID == interaction.user.id) return interaction.reply({ content: "You can't bid on your own pokemon.", ephemeral: true });
                else if (auction.BidUser == interaction.user.id) return interaction.reply({ content: "You already have a bid on this pokemon.", ephemeral: true });
                else {
                    var bid_price = interaction.options.get("credits").value;
                    if (bid_price > user.PokeCredits) return interaction.reply({ content: "You have insufficient balance to bid on this pokemon.", ephemeral: true });
                    if (bid_price <= auction.BidPrice) return interaction.reply({ content: `You must bid higher than the current bid. The current bid is ${auction.BidPrice}`, ephemeral: true });
                    if (bid_price > auction.BuyOut) return interaction.reply({ content: `You can't bid higher than the buyout price. The buyout price is ${auction.BuyOut}`, ephemeral: true });

                    var update_data = new prompt_model({
                        ChannelID: interaction.channel.id,
                        PromptType: "ConfirmBid",
                        UserID: {
                            User1ID: interaction.user.id
                        },
                        List: {
                            PokemonUID: auction.PokemonUID,
                            AuctionID: auction.AuctionID,
                            AuctionPrice: bid_price
                        }
                    });
                    update_data.save().then(() => {
                        return interaction.reply({ content: `Are you sure you want to bid ${bid_price} credits on this level ${auction.Level} ${auction.PokemonName}${auction.Shiny == true ? " :star:" : ""} ?\nType \`\`/confirmbid\`\` to confirm or \`\`/cancel\`\` to cancel the bid.` });
                    });
                }
            });
        }

        // For auction claim command
        else if (interaction.options.getSubcommand() === "claim") {
            auction_model.findOne({ "AuctionID": interaction.options.get("id").value }, (err, auction) => {
                if (auction == undefined || auction == null || !auction || auction.length == 0) return interaction.reply({ content: "We couldn't find any pokemon associted with that auction ID.", ephemeral: true });

                // Credits claim.
                if (auction.UserID == interaction.user.id && auction.BidTime < new Date() && auction.BidUser != interaction.user.id && auction.BidPrice != undefined && auction.OwnerClaimed == undefined) {
                    var tax_price = [];
                    if (auction.BidPrice > 9999 && auction.BidPrice < 100000) tax_price = ["10,000", 1.5, percentCalculation(auction.BidPrice, 1.5).toFixed(0)];
                    else if (auction.BidPrice > 99999 && auction.BidPrice < 100000) tax_price = ["1,00,000", 3, percentCalculation(auction.BidPrice, 3).toFixed(0)]
                    else if (auction.BidPrice > 999999) tax_price = ["10,00,000", 5, percentCalculation(auction.BidPrice, 5).toFixed(0)];

                    auction.OwnerClaimed = true;
                    if (auction.UserClaimed == true) auction.remove();
                    else auction.save();
                    user.PokeCredits += auction.BidPrice - (tax_price.length > 0 ? tax_price[2] : 0);

                    user.save().then(() => {
                        interaction.reply({ content: `Successfully claimed ${auction.BidPrice - (tax_price.length > 0 ? tax_price[2] : 0)} credits from auction ID ${auction.AuctionID}. ${tax_price.length > 0 ? `As your pokémon was auctioned for over ${tax_price[0]}, ${tax_price[1]}% tax was taken and you received ${auction.BidPrice - tax_price[2]}.` : ""}` });
                    });

                }
                // Pokemon claim not auctioned by anyone.
                else if (auction.UserID == interaction.user.id && auction.BidPrice == undefined) {
                    if (auction.BidTime > new Date()) return interaction.reply({ content: "You can only claim your pokémon or credits once the auction time has ended.", ephemeral: true });
                    let pokemon_data = {
                        CatchedOn: auction.CatchedOn,
                        IV: auction.IV,
                        EV: auction.EV,
                        PokemonId: auction.PokemonId,
                        Experience: auction.Experience,
                        Level: auction.Level,
                        Nature: auction.NatureValue,
                        Shiny: auction.Shiny,
                        Reason: auction.Reason
                    }
                    auction.remove().then(() => {
                        getPokemons.insertpokemon(interaction.user.id, pokemon_data).then(result => {
                            interaction.reply({ content: `Successfully claimed your pokemon from auction ID ${auction.AuctionID}` });
                        });
                    });
                }
                // Pokemon claim by bid user.
                else if (auction.UserID != interaction.user.id && auction.BidUser == interaction.user.id && auction.BidPrice != undefined && auction.UserClaimed == undefined) {
                    if (auction.BidTime > new Date()) return interaction.reply({ content: "You can only claim any pokémon if the auction time has ended.", ephemeral: true });
                    let pokemon_data = {
                        CatchedOn: auction.CatchedOn,
                        IV: auction.IV,
                        EV: auction.EV,
                        PokemonId: auction.PokemonId,
                        Experience: auction.Experience,
                        Level: auction.Level,
                        Nature: auction.NatureValue,
                        Shiny: auction.Shiny,
                        Reason: auction.Reason
                    }
                    auction.UserClaimed = true;
                    if (auction.OwnerClaimed == true) auction.remove();
                    else auction.save();

                    getPokemons.insertpokemon(interaction.user.id, pokemon_data).then(result => {
                        interaction.reply({ content: `Successfully claimed your pokémon from auction ID ${auction.AuctionID}` });
                    });
                }
                else return interaction.reply({ content: "You can't claim this pokemon.", ephemeral: true });
            });
        }
        // For auction listings command
        else if (interaction.options.getSubcommand() === "listings") {
            return arg_parsing(interaction, "listings", pokemons)
        }
        // For auction search command.
        else if (interaction.options.getSubcommand() === "search") {
            return arg_parsing(interaction, "search", pokemons);
        }
        else return interaction.reply({ content: "Invalid command. Type `/help` for a list of commands.", ephemeral: true });
    });
}

// Function for arg parsing and understanding.
function arg_parsing(interaction, command, pokemons) {
    var showiv = false;
    var request_query = [];
    var order_type = {};
    var args = interaction.options.get("filter") ? interaction.options.get("filter").value.replaceAll("—", "--").split(" ") : [];

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
        if (args[1] != undefined && (args[1].toLowerCase() == "iv")) { order_type = { "IVPercentage": order_arrange } }
        else if (args[1] != undefined && (args[1].toLowerCase() == "id")) { order_type = { "MarketID": order_arrange } }
        else if (args[1] != undefined && (args[1].toLowerCase() == "level" || args[1].toLowerCase() == "lvl" || args[1].toLowerCase() == "l")) { order_type = { "Level": order_arrange } }
        else if (args[1] != undefined && (args[1].toLowerCase() == "name" || args[1].toLowerCase() == "n")) { order_type = { "PokemonName": order_arrange } }
        else if (args[1] != undefined && (args[1].toLowerCase() == "price" || args[1].toLowerCase() == "p")) { order_type = { "Price": order_arrange } }

        if (command == "search") {
            auction_model.find({ $and: [{ "Primary": undefined }, { "BidTime": { $gt: new Date() } }] }).sort(order_type).exec((err, auction) => {
                if (auction == undefined || auction == null || !auction || auction.length == 0) {
                    return interaction.reply({ content: "No auction listings found.", ephemeral: true });
                } else {
                    var temp_counter = 0;
                    var tot_len = auction.length;
                    var split_chunks = spliceIntoChunks(auction, 20);
                    var embeds = [];
                    var current_index = 0;
                    for (i = 0; i < split_chunks.length; i++) {
                        embeds[i] = new Discord.EmbedBuilder();
                        embeds[i].setTitle("PokéFort Auction:");
                        var description = "";
                        temp_counter += split_chunks[i].length;
                        for (j = 0; j < split_chunks[i].length; j++) {
                            current_index = temp_counter - split_chunks[i].length + 1;
                            var bid_time = new Date(split_chunks[i][j].BidTime);
                            var time_left = new Date(bid_time.getTime() - new Date().getTime());
                            var time_left_string = `Left: ${time_left.getUTCHours() != 0 ? time_left.getUTCHours() + "h " : ""}${time_left.getUTCMinutes() != 0 ? time_left.getUTCMinutes() + "min" : ""}`;
                            description += `Level ${split_chunks[i][j]["Level"]} ${split_chunks[i][j]["PokemonName"]}${split_chunks[i][j].Shiny == true ? " :star:" : ""} | ID: ${split_chunks[i][j]["AuctionID"]}${showiv == true ? ` | IV: ${split_chunks[i][j].IVPercentage}% ` : ``} | Bid: ${split_chunks[i][j]["BidPrice"] != undefined ? split_chunks[i][j]["BidPrice"] : "None"} ${time_left.getUTCMinutes() < 10 ? "| :hourglass_flowing_sand:" : "| " + time_left_string}\n`;
                        }
                        embeds[i].setDescription(description);
                        embeds[i].setFooter({ text: `Page: ${i + 1}/${split_chunks.length} Showing ${current_index} to ${(current_index - 1) + split_chunks[i].length} out of ${tot_len}` });
                    }
                    interaction.reply({ embeds: [embeds[0]], fetchReply: true }).then(msg => {
                        if (split_chunks.length > 1) return pagination.createpage(interaction.channel.id, interaction.user.id, msg.id, embeds, 0);
                        else return;
                    });
                }
            });
        }
        else if (command == "listings") {
            auction_model.find({ $and: [{ "UserID": interaction.user.id }, { "OwnerClaimed": undefined }] }).sort(order_type).exec((err, auction) => {
                if (auction == undefined || auction == null || !auction || auction.length == 0) {
                    return interaction.reply({ content: "No auction listings found.", ephemeral: true });
                } else {
                    var temp_counter = 0;
                    var tot_len = auction.length;
                    var split_chunks = spliceIntoChunks(auction, 20);
                    var embeds = [];
                    var current_index = 0;
                    for (i = 0; i < split_chunks.length; i++) {
                        embeds[i] = new Discord.EmbedBuilder();
                        embeds[i].setTitle("Your Auction Listings:");
                        var description = "";
                        temp_counter += split_chunks[i].length;
                        for (j = 0; j < split_chunks[i].length; j++) {
                            current_index = temp_counter - split_chunks[i].length + 1;
                            var bid_time = new Date(split_chunks[i][j].BidTime);
                            var time_left = new Date(bid_time.getTime() - new Date().getTime());
                            var time_left_string = `Left: ${time_left.getUTCHours() != 0 ? time_left.getUTCHours() + "h " : ""}${time_left.getUTCMinutes() != 0 ? time_left.getUTCMinutes() + "min" : ""}`;
                            description += `Level ${split_chunks[i][j]["Level"]} ${split_chunks[i][j]["PokemonName"]}${split_chunks[i][j].Shiny == true ? " :star:" : ""} | ID: ${split_chunks[i][j]["AuctionID"]}${showiv == true ? ` | IV: ${split_chunks[i][j].IVPercentage}% ` : ``} | Buyout: ${split_chunks[i][j]["BuyOut"]} Credits | Bid: ${split_chunks[i][j]["BidPrice"] != undefined ? split_chunks[i][j]["BidPrice"] : "None"} ${time_left.getTime() < 0 ? "| Finished" : `| ${time_left_string}`}\n`;
                        }
                        embeds[i].setDescription(description);
                        embeds[i].setFooter({ text: `Page: ${i + 1}/${split_chunks.length} Showing ${current_index} to ${(current_index - 1) + split_chunks[i].length} out of ${tot_len}` });
                    }
                    interaction.reply({ embeds: [embeds[0]], fetchReply: true }).then(msg => {
                        if (split_chunks.length > 1) return pagination.createpage(interaction.channel.id, interaction.user.id, msg.id, embeds, 0);
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
            else if (new_args.length == 1 && (_.isEqual(new_args[0], "--gmax") || _.isEqual(new_args[0], "--gigantamax"))) { gigantamax(new_args); }
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
            else return interaction.reply({ content: "Invalid command.", ephemeral: true });

            // Check if error occurred in previous loop
            if (error.length > 1) {
                interaction.reply({ content: `Error: Argument ${'``' + error[0] + '``'} says ${error[1][1]}`, ephemeral: true });
                break;
            }
            if (j == total_args.length - 1) {
                if (command == "listings") {
                    request_query.unshift({ "UserID": interaction.user.id });
                    auction_model.find({ $and: request_query }).sort(order_type).exec((err, auction) => {
                        if (auction == undefined || auction == null || !auction || auction.length == 0) {
                            return interaction.reply({ content: "No auction listings found for your search.", ephemeral: true });
                        } else {
                            var temp_counter = 0;
                            var tot_len = auction.length;
                            var split_chunks = spliceIntoChunks(auction, 20);
                            var embeds = [];
                            var current_index = 0;
                            for (i = 0; i < split_chunks.length; i++) {
                                embeds[i] = new Discord.EmbedBuilder();
                                embeds[i].setTitle("Your Auction Listings:");
                                var description = "";
                                temp_counter += split_chunks[i].length;
                                for (j = 0; j < split_chunks[i].length; j++) {
                                    current_index = temp_counter - split_chunks[i].length + 1;
                                    var bid_time = new Date(split_chunks[i][j].BidTime);
                                    var time_left = new Date(bid_time.getTime() - new Date().getTime());
                                    var time_left_string = `Left: ${time_left.getUTCHours() != 0 ? time_left.getUTCHours() + "h " : ""}${time_left.getUTCMinutes() != 0 ? time_left.getUTCMinutes() + "min" : ""}`;
                                    description += `Level ${split_chunks[i][j]["Level"]} ${split_chunks[i][j]["PokemonName"]}${split_chunks[i][j].Shiny == true ? " :star:" : ""} | ID: ${split_chunks[i][j]["AuctionID"]}${showiv == true ? ` | IV: ${split_chunks[i][j].IVPercentage}% ` : ``} | Bid: ${split_chunks[i][j]["BidPrice"] != undefined ? split_chunks[i][j]["BidPrice"] + " Credits" : "None"} ${time_left.getHours() < 1 ? "| :hourglass_flowing_sand:" : "| " + time_left_string}\n`;
                                }
                                embeds[i].setDescription(description);
                                embeds[i].setFooter({ text: `Page: ${i + 1}/${split_chunks.length} Showing ${current_index} to ${(current_index - 1) + split_chunks[i].length} out of ${tot_len}` });
                            }
                            interaction.reply({ embeds: [embeds[0]], fetchReply: true }).then(msg => {
                                if (split_chunks.length > 1) return pagination.createpage(interaction.channel.id, interaction.user.id, msg.id, embeds, 0);
                                else return;
                            });
                        }
                    });
                }
                if (command == "search") {
                    request_query.push({ "BidTime": { $gt: new Date() } });
                    auction_model.find({ $and: request_query }).sort(order_type).exec((err, auction) => {
                        if (auction == undefined || auction == null || !auction || auction.length == 0) {
                            return interaction.reply({ content: "No auction listings found for your search.", ephemeral: true });
                        } else {
                            var temp_counter = 0;
                            var tot_len = auction.length;
                            var split_chunks = spliceIntoChunks(auction, 20);
                            var embeds = [];
                            var current_index = 0;
                            for (i = 0; i < split_chunks.length; i++) {
                                embeds[i] = new Discord.EmbedBuilder();
                                embeds[i].setTitle("PokéFort Auction:");
                                var description = "";
                                temp_counter += split_chunks[i].length;
                                for (j = 0; j < split_chunks[i].length; j++) {
                                    current_index = temp_counter - split_chunks[i].length + 1;
                                    var bid_time = new Date(split_chunks[i][j].BidTime);
                                    var time_left = new Date(bid_time.getTime() - new Date().getTime());
                                    var time_left_string = `Left: ${time_left.getUTCHours() != 0 ? time_left.getUTCHours() + "h " : ""}${time_left.getUTCMinutes() != 0 ? time_left.getUTCMinutes() + "min" : ""}`;
                                    description += `Level ${split_chunks[i][j]["Level"]} ${split_chunks[i][j]["PokemonName"]}${split_chunks[i][j].Shiny == true ? " :star:" : ""} | ID: ${split_chunks[i][j]["AuctionID"]}${showiv == true ? ` | IV: ${split_chunks[i][j].IVPercentage}% ` : ``} | Bid: ${split_chunks[i][j]["BidPrice"] != undefined ? split_chunks[i][j]["BidPrice"] : "None"} ${time_left.getUTCMinutes() < 10 ? "| :hourglass_flowing_sand:" : "| " + time_left_string}\n`;
                                }
                                embeds[i].setDescription(description);
                                embeds[i].setFooter({ text: `Page: ${i + 1}/${split_chunks.length} Showing ${current_index} to ${(current_index - 1) + split_chunks[i].length} out of ${tot_len}` });
                            }
                            interaction.reply({ embeds: [embeds[0]], fetchReply: true }).then(msg => {
                                if (split_chunks.length > 1) return pagination.createpage(interaction.channel.id, interaction.user.id, msg.id, embeds, 0);
                                else return;
                            });
                        }
                    });
                }
            }
        }

        // For auction --shiny command.
        function shiny(args) {
            request_query.push({ "Shiny": true });
        }

        // For auction --showiv command.
        function show_iv(args) {
            showiv = true;
        }

        // For auction --type command.
        function type(args) {
            request_query.push({ "Type": { $regex: new RegExp(`^${args[1]}`, 'i') } });
        }

        // For auction --name command.
        function name(args) {
            const [, ...name] = args;
            request_query.push({ "PokemonName": { $regex: new RegExp(`^${name.join(" ")}`, 'i') } });
        }

        // For auction --held command.
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

        // For auction --gigantamax command.
        function gigantamax() {
            var gigantamax = pokemons.filter(it => it["Alternate Form Name"] === "Gigantamax");
            var gigantamax_list = [];
            for (var i = 0; i < gigantamax.length; i++) {
                gigantamax_list.push(gigantamax[i]["Pokemon Id"]);
            }
            request_query.push({ "PokemonId": { $in: gigantamax_list } });
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

        // For auction --level command.
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

        // For auction --iv command.
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

        // For auction --hpiv command.
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

        // For auction --atkiv command.
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

        // For auction --defiv command.
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

        // For auction --spatkiv command.
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

        // For auction --spdefiv command.
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

        // For auction --speediv command.
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

        // For auction --order command.
        function order(args) {
            var order_arrange = "asc";
            if (Object.keys(order_type).length != 0) return error[1] = [false, "You can only use order command once."];
            if (args.length == 3 && (args[2] == "asc" || args[2] == "ascending" || args[2] == 'a')) order_arrange = "asc";
            if (args.length == 3 && (args[2] == "desc" || args[2] == "descending" || args[2] == 'd')) order_arrange = "desc";
            if (args[1].toLowerCase() == "iv") { order_type = { "IVPercentage": order_arrange } }
            else if (args[1].toLowerCase() == "id") { order_type = { "AuctionID": order_arrange } }
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

// Function to chunk given data.
function spliceIntoChunks(arr, chunkSize) {
    const res = [];
    while (arr.length > 0) {
        const chunk = arr.splice(0, chunkSize);
        res.push(chunk);
    }
    return res;
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
    name: "auction",
    description: "Auction Commands",
    options: [{
        name: "list",
        description: "List your pokemon in auction.",
        type: 1,
        options: [{
            name: "id",
            description: "ID of the pokemon to list.",
            type: 4,
            required: true,
            min_value: 1
        }, {
            name: "buyout",
            description: "Buyout price of the pokemon.",
            type: 4,
            required: true,
            min_value: 1,
            max_value: 1000000000,
        }, {
            name: "time",
            description: "Time in hours/minutes to list the pokemon.",
            type: 3,
            required: true,
            min_length: 2
        }]
    }, {
        name: "bid",
        description: "Bid on a pokemon in auction.",
        type: 1,
        options: [{
            name: "id",
            description: "ID of the pokemon to bid on.",
            type: 4,
            required: true,
            min_value: 1
        }, {
            name: "credits",
            description: "Credits to bid on the pokemon.",
            type: 4,
            required: true,
            min_value: 1
        }]
    }, {
        name: "listings",
        description: "List of all your pokemon in auction.",
        options: [{
            name: "filter",
            description: "Filter for the search.",
            type: 3,
            min_length: 1
        }],
        type: 1
    }, {
        name: "bids",
        description: "List of all your bids on pokemon in auction.",
        type: 1
    }, {
        name: "claim",
        description: "Claim a pokemon in auction.",
        type: 1,
        options: [{
            name: "id",
            description: "ID of the pokemon to claim.",
            type: 4,
            required: true,
            min_value: 1
        }]
    }, {
        name: "view",
        description: "View a pokemon in auction.",
        type: 1,
        options: [{
            name: "id",
            description: "ID of the pokemon to view.",
            type: 4,
            required: true,
            min_value: 1
        }]
    }, {
        name: "search",
        description: "Search for a pokemon in auction.",
        type: 1,
        options: [{
            name: "filter",
            description: "Filter for the search.",
            type: 3,
            min_length: 1
        }],
    }],
    aliases: []
}