require("dotenv").config();
const { startTrading, bot } = require("./src/bot");
require("./src/db"); // Ensure the database connection is established

startTrading();
bot.launch();
