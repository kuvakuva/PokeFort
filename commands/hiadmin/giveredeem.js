const user_model = require('../../models/user');

module.exports.run = async (bot, message, args, prefix, user_available, pokemons) => {
    if (!user_available) { message.channel.send(`You should have started to use this command! Use ${prefix}start to begin the journey!`); return; }

    if (args.length == 0 || args.length < 2) { return; }
    var user_id = args[0].substring(args[0].length, 3).slice(0, -1);
    var amount = args[1];
    if (!isInt(amount)) { return; }

    user_model.findOne({ UserID: message.author.id }, (err, user) => {
        if (user.Admin != 1) return;
        message.channel.send("Admin Access Granted!");
        user_model.findOne({ UserID: user_id }, (err, user_2) => {
            if (!user_2) return message.channel.send("User not found!");
            user_model.findOneAndUpdate({ UserID: user_id }, { $inc: { Redeems: amount } }, (err, user_3) => {
                if (err) return console.log(err);
                bot.users.fetch(user_id).then(user_data => {
                    var old_redeems = user_2.Redeems == undefined ? 0 : user_2.Redeems;
                    message.channel.send(`${user_data.username}'s Redeem increased by ${amount}. Balance: ${old_redeems + parseInt(amount)}`);
                });
            });
        });
    });

}

// Check if its int
function isInt(value) {
    var x = parseFloat(value);
    return !isNaN(value) && (x | 0) === x;
}

module.exports.config = {
    name: "giveredeem",
    aliases: []
}