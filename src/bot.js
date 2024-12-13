const { Telegraf, Markup } = require("telegraf");
const { createWalletsFromMnemonic } = require("./utils");
const TonWeb = require("tonweb");
const config = require("../config/config");
const User = require("./models/User");
const {
  addPair,
  removePair,
  listPairs,
  showHelp,
  startPair,
  stopPair,
  statusPairs,
  setExchange,
  setTradingLimits,
  setDelay,
  createWallets,
  transferToExternalWallet,
  setRentalStatus,
  setRentalExpiry,
  setRentalPaymentAmount,
  setRentalWalletAddress,
  fundAllWallets,
  startFreeTrial,
  checkMacAddress,
} = require("./commands");

const bot = new Telegraf(config.telegram.token);
let userState = {};

const renderMainMenu = async (ctx) => {
  const mainMenu = Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "🔗 Connect Main Wallet via Mnemonics",
        "CONNECT_WALLET_MNEMONIC"
      ),
      Markup.button.callback(
        "🔗 Connect Wallet via Extension/App",
        "CONNECT_WALLET_REDIRECT"
      ),
    ],
    [Markup.button.callback("👜 Create Wallets", "CREATE_WALLETS")],
    [
      Markup.button.callback("➕ Add Pair", "ADD_PAIR"),
      Markup.button.callback("🌐 Set Exchange", "SET_EXCHANGE"),
      Markup.button.callback("➖ Remove Pair", "REMOVE_PAIR"),
    ],
    [Markup.button.callback("📄 List Pairs", "LIST_PAIRS")],
    [
      Markup.button.callback("▶️ Start Pair", "START_PAIR"),
      Markup.button.callback("⚙️ Status", "STATUS"),
      Markup.button.callback("⏹️ Stop Pair", "STOP_PAIR"),
    ],
    [
      Markup.button.callback("⏱ Set Delay", "SET_DELAY"),
      Markup.button.callback("🔢 Set Trade Limits", "SET_LIMITS"),
    ],
    [
      Markup.button.callback("💸 Transfer Funds", "TRANSFER_FUNDS"),
      Markup.button.callback("📢 Fund All Wallets", "FUND_WALLETS"),
    ],
    [Markup.button.callback("💸 Manage Rental", "MANAGE_RENTAL")],
    [Markup.button.callback("💼 Wallets", "WALLETS")],
    [Markup.button.callback("ℹ️ Help", "HELP")],
    [Markup.button.callback("🆓 Start Free Trial", "START_FREE_TRIAL")],
  ]).resize();
  await ctx.reply("Please select an action:", mainMenu);
};

const renderRentalMenu = async (ctx) => {
  const rentalMenu = Markup.inlineKeyboard([
    [
      Markup.button.callback("💸 Set Rental Amount", "SET_RENTAL_AMOUNT"),
      Markup.button.callback("🔔 Enable Rental", "ENABLE_RENTAL"),
      Markup.button.callback("🔕 Disable Rental", "DISABLE_RENTAL"),
    ],
    [
      Markup.button.callback("🕒 Set Rental Time", "SET_RENTAL_TIME"),
      Markup.button.callback("💼 Set Rental Wallet", "SET_RENTAL_WALLET"),
    ],
    [Markup.button.callback("🔙 Back to Main Menu", "MAIN_MENU")],
  ]).resize();
  await ctx.reply("Select a rental management action:", rentalMenu);
};

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  let user = await User.findOne({ userId });

  if (!user) {
    user = new User({
      userId,
      pairs: {},
      activePairs: [],
      rental: {
        enabled: false,
        expiry: null,
        paymentAmount: null,
        walletAddress: null,
      },
    });
    await user.save();
  }

  const welcomeMessage = `
👋 Welcome to the Trading Bot! Your user ID: ${userId}.
Use the buttons below to execute commands or type /help for more information.
  `;
  await ctx.reply(welcomeMessage);
  await renderMainMenu(ctx);
});

// Handle the callback queries from the inline buttons
const commandMap = {
  CREATE_WALLETS: async (ctx) => {
    userState[ctx.from.id] = { awaiting: "CREATE_WALLETS" };
    await ctx.reply(
      '👜 Please enter the mnemonic followed by the number of wallets, separated by a space. For example: "word1 word2 ... word24 5".'
    );
  },
  CONNECT_WALLET_MNEMONIC: async (ctx) => {
    userState[ctx.from.id] = { awaiting: "CONNECT_WALLET_MNEMONIC" };
    await ctx.reply("🔗 Please enter your wallet mnemonic.");
  },
  CONNECT_WALLET_REDIRECT: async (ctx) => {
    userState[ctx.from.id] = { awaiting: "CONNECT_WALLET_REDIRECT" };

    const replyMarkup = Markup.inlineKeyboard([
      Markup.button.url(
        "🌐 Web (Chrome extension)",
        "https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd"
      ),
      Markup.button.url("📱 Mobile App", "https://ton.org/en/wallets"),
    ]).resize();

    await ctx.reply(
      "🔗 Please connect your wallet using the appropriate method:",
      replyMarkup
    );
    userState[ctx.from.id] = null; // Reset the state after processing
  },
  ADD_PAIR: async (ctx) => {
    userState[ctx.from.id] = { awaiting: "ADD_PAIR" };
    await ctx.reply("➕ Please enter the contract address of the pair.");
  },
  REMOVE_PAIR: async (ctx) => {
    userState[ctx.from.id] = { awaiting: "REMOVE_PAIR" };
    await ctx.reply("➖ Please enter the wallet address to remove.");
  },
  LIST_PAIRS: async (ctx) => {
    await listPairs(ctx, ctx.from.id);
  },
  START_PAIR: async (ctx) => {
    userState[ctx.from.id] = { awaiting: "START_PAIR" };
    await ctx.reply("▶️ Please enter the wallet address to start trading.");
  },
  STOP_PAIR: async (ctx) => {
    userState[ctx.from.id] = { awaiting: "STOP_PAIR" };
    await ctx.reply("⏹️ Please enter the wallet address to stop trading.");
  },
  STATUS: async (ctx) => {
    await statusPairs(ctx, ctx.from.id);
  },
  SET_EXCHANGE: async (ctx) => {
    userState[ctx.from.id] = { awaiting: "SET_EXCHANGE" };
    await ctx.reply("🌐 Please enter the exchange name (dedust or stonfi).");
  },
  SET_LIMITS: async (ctx) => {
    userState[ctx.from.id] = { awaiting: "SET_LIMITS" };
    await ctx.reply(
      "🔢 Please enter the minimum and maximum trade amounts separated by a space. For example: 1 100."
    );
  },
  SET_DELAY: async (ctx) => {
    userState[ctx.from.id] = { awaiting: "SET_DELAY" };
    await ctx.reply(
      "⏱ Please enter the delay between trades in milliseconds. For example: 1000."
    );
  },
  TRANSFER_FUNDS: async (ctx) => {
    userState[ctx.from.id] = { awaiting: "TRANSFER_FUNDS" };
    await ctx.reply(
      "💸 Please enter the external TON blockchain wallet address to transfer funds."
    );
  },
  FUND_WALLETS: async (ctx) => {
    userState[ctx.from.id] = { awaiting: "FUND_WALLETS" };
    await ctx.reply(
      '📢 Please enter the funding wallet address and the amount to distribute to each created wallet, separated by a space. For example: "0xFundingWalletAddress 10".'
    );
  },
  SET_RENTAL_AMOUNT: async (ctx) => {
    userState[ctx.from.id] = { awaiting: "SET_RENTAL_AMOUNT" };
    await ctx.reply("💸 Please enter the amount in USDT. For example: 1000");
  },
  ENABLE_RENTAL: async (ctx) => {
    await setRentalStatus(ctx, true);
    await ctx.reply("✅ Rental status enabled.");
  },
  DISABLE_RENTAL: async (ctx) => {
    await setRentalStatus(ctx, false);
    await ctx.reply("❌ Rental status disabled.");
  },
  SET_RENTAL_TIME: async (ctx) => {
    userState[ctx.from.id] = { awaiting: "SET_RENTAL_TIME" };
    await ctx.reply(
      "⏰ Please enter the user ID and the rental expiry date (YYYY-MM-DD)."
    );
  },
  SET_RENTAL_WALLET: async (ctx) => {
    userState[ctx.from.id] = { awaiting: "SET_RENTAL_WALLET" };
    await ctx.reply("💼 Please enter the rental wallet address.");
  },
  WALLETS: async (ctx) => {
    const userId = ctx.from.id;
    const user = await User.findOne({ userId });

    if (user && user.pairs) {
      let walletsList = "💼 Your Wallets:\n";
      for (let wallet of Object.keys(user.pairs)) {
        walletsList += `🔹 Wallet: ${wallet}\n`;
      }
      await ctx.reply(walletsList);
    } else {
      await ctx.reply("🚫 No wallets found. Please create wallets first.");
    }
  },
  HELP: async (ctx) => {
    await showHelp(ctx);
    await renderMainMenu(ctx);
  },
  START_FREE_TRIAL: async (ctx) => {
    await startFreeTrial(ctx);
  },
  MANAGE_RENTAL: async (ctx) => {
    await renderRentalMenu(ctx);
  },
  MAIN_MENU: async (ctx) => {
    await renderMainMenu(ctx);
  },
};

Object.keys(commandMap).forEach((action) => {
  bot.action(action, commandMap[action]);
});

bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const message = ctx.message.text;

  if (userState[userId]) {
    const state = userState[userId].awaiting;
    switch (state) {
      case "CREATE_WALLETS":
        const mnemonicParts = message.split(" ");
        const numberOfWallets = parseInt(mnemonicParts.pop(), 10);
        const mnemonic = mnemonicParts.join(" ");
        if (mnemonicParts.length !== 24 || isNaN(numberOfWallets)) {
          await ctx.reply(
            `❌ Invalid input format. Please make sure you have exactly 24 words followed by a number.`
          );
          return;
        }
        await createWallets(
          ctx,
          userId,
          numberOfWallets,
          createWalletsFromMnemonic,
          mnemonic
        );
        await ctx.reply(
          "Do you want to fund your wallets immediately? (yes/no)"
        );
        userState[userId] = { awaiting: "FUND_IMMEDIATELY" }; // Next state
        break;

      case "CONNECT_WALLET_MNEMONIC":
        const userMnemonic = message.trim();
        if (userMnemonic.split(" ").length !== 24) {
          await ctx.reply(
            "❌ Invalid mnemonic. Please enter exactly 24 words."
          );
        } else {
          const connected = await connectWalletUsingMnemonic(
            ctx,
            userId,
            userMnemonic
          );
          if (connected) {
            await ctx.reply("🔗 Wallet connected successfully using mnemonic.");
          } else {
            await ctx.reply("❌ Failed to connect wallet. Please try again.");
          }
          userState[userId] = null; // Reset the state after processing
        }
        break;

      case "ADD_PAIR":
        const contractAddress = message.trim();
        if (!contractAddress.match(/^(EQ|eq)/)) {
          await ctx.reply("❌ Invalid contract address format.");
        } else {
          await addPair(ctx, userId, contractAddress);
          await ctx.reply(
            `➕ Pair added for contract address: ${contractAddress}`
          );
          userState[userId] = null; // Reset the state after processing
        }
        break;

      case "REMOVE_PAIR":
        const wallet = message;
        await removePair(ctx, userId, wallet);
        await ctx.reply(`➖ Pair removed: Wallet: ${wallet}`);
        userState[userId] = null; // Reset the state after processing
        break;

      case "START_PAIR":
        const startWallet = message;
        await startPair(ctx, userId, startWallet);
        await ctx.reply(`▶️ Trading started for wallet: ${startWallet}`);
        userState[userId] = null; // Reset the state after processing
        break;

      case "STOP_PAIR":
        const stopWallet = message;
        await stopPair(ctx, userId, stopWallet);
        await ctx.reply(`⏹️ Trading stopped for wallet: ${stopWallet}`);
        userState[userId] = null; // Reset the state after processing
        break;

      case "SET_EXCHANGE":
        const exchange = message.toLowerCase();
        if (!["dedust", "stonfi"].includes(exchange)) {
          await ctx.reply(
            "❌ Invalid exchange. Please enter 'dedust' or 'stonfi'."
          );
        } else {
          await setExchange(ctx, userId, exchange);
          await ctx.reply(`🌐 Exchange set to ${exchange}.`);
          userState[userId] = null; // Reset the state after processing
        }
        break;

      case "SET_LIMITS":
        const limitsParts = message.split(" ");
        if (limitsParts.length < 2) {
          await ctx.reply(
            "❌ Invalid format. Please enter the minimum and maximum trade amounts separated by a space. For example: 1 100."
          );
        } else {
          const [min, max] = limitsParts.map(Number);
          await setTradingLimits(ctx, userId, min, max);
          await ctx.reply(`🔢 Trading limits set: Min: ${min}, Max: ${max}`);
          userState[userId] = null; // Reset the state after processing
        }
        break;

      case "SET_DELAY":
        const delay = parseInt(message, 10);
        if (isNaN(delay)) {
          await ctx.reply(
            "❌ Invalid format. Please enter a valid number. For example: 1000."
          );
        } else {
          await setDelay(ctx, userId, delay);
          await ctx.reply(`⏱ Delay set to ${delay} milliseconds.`);
          userState[userId] = null; // Reset the state after processing
        }
        break;

      case "TRANSFER_FUNDS":
        const walletAddress = message;
        await transferToExternalWallet(ctx, userId, walletAddress);
        await ctx.reply(`💸 Funds transferred to wallet: ${walletAddress}`);
        userState[userId] = null; // Reset the state after processing
        break;

      case "FUND_WALLETS":
        const fundingParts = message.split(" ");
        const fundingWallet = fundingParts[0];
        const amount = parseFloat(fundingParts[1]);

        if (!fundingWallet || isNaN(amount)) {
          await ctx.reply(
            `❌ Invalid input format. Please provide a valid wallet address and amount. For example: "0xFundingWalletAddress 10".`
          );
          return;
        }

        await fundAllWallets(ctx, userId, fundingWallet, amount);
        userState[userId] = null; // Reset the state after processing
        break;

      case "FUND_IMMEDIATELY":
        if (message.toLowerCase() === "yes") {
          await ctx.reply(
            "📢 Please enter the funding wallet address and the amount, separated by a space."
          );
          userState[userId] = { awaiting: "FUND_WALLETS" }; // Reuse the FUND_WALLETS state
        } else {
          await ctx.reply("Wallet creation completed without initial funding.");
          userState[userId] = null; // Reset the state after processing
        }
        break;

      default:
        await ctx.reply(`❌ Unrecognized command: ${message}`);
        userState[userId] = null; // Reset the state after processing
    }
  } else {
    await ctx.reply(
      `❌ Unrecognized input: ${message}. Please use the buttons or type /help for guidance.`
    );
  }
});

// Function to connect wallet using mnemonic
async function connectWalletUsingMnemonic(ctx, userId, mnemonic) {
  try {
    // Logic to connect the wallet using the mnemonic provided
    const wallets = await createWalletsFromMnemonic(mnemonic);

    // Save the wallets to your database or whatever is appropriate
    // Simulating some saving mechanism here, you need to implement it as needed
    await User.updateOne({ userId }, { $set: { mainWallet: wallets[0] } });

    console.log(`User ${userId} connected wallet using mnemonic`); // Logging
    return true;
  } catch (error) {
    console.error("Error connecting wallet using mnemonic:", error);
    return false;
  }
}

// Function to simulate connecting TON wallet (pseudo-code)
async function connectTonWallet(userId, tonWalletAddress) {
  const provider = new TonWeb.HttpProvider(
    "https://toncenter.com/api/v2/jsonRPC",
    {
      apiKey:
        "cd6feca92500c9251f4fb40c9d96c1a21978522c29c95c04e3f7453382736145",
    }
  );
  const tonweb = new TonWeb(provider);
  try {
    // Parse the wallet address using TonWeb's util
    const walletAddress = new TonWeb.utils.Address(tonWalletAddress);
    console.log(`Parsed wallet address: ${walletAddress.toString()}`); // Logging parsed address

    // Fetch account balance to check
    const balance = await tonweb.getBalance(walletAddress);

    if (balance === undefined) {
      throw new Error(
        "Balance is undefined. Possible reasons: invalid address or server error."
      );
    }

    const balanceInTon = TonWeb.utils.fromNano(balance);
    console.log(`Balance in TON: ${balanceInTon}`); // Logging balance

    // Proceed with your logic; here we just print the balance
    console.log(`User ${userId} connected wallet with balance ${balanceInTon}`);
  } catch (error) {
    console.error("Error connecting TON wallet:", error.message);
    console.error("Error stack:", error.stack);
  }
}

async function trade() {
  try {
    const users = await User.find();
    for (const user of users) {
      if (!user.activePairs) {
        user.activePairs = [];
      }
      if (user.pairs) {
        for (const [wallet, tokenDetails] of Object.entries(user.pairs)) {
          if (user.activePairs.includes(wallet)) {
            const amount = getRandomAmount(
              tokenDetails.minAmount,
              tokenDetails.maxAmount
            );
            const tradeType = Math.random() < 0.5 ? "buy" : "sell";

            try {
              let tradeResult;
              if (user.exchange === "dedust") {
                tradeResult = await dedust.placeOrder(
                  wallet,
                  tokenDetails.token,
                  amount,
                  tradeType
                );
              } else if (user.exchange === "stonfi") {
                tradeResult = await stonfi.placeOrder(
                  wallet,
                  tokenDetails.token,
                  amount,
                  tradeType
                );
              }

              bot.telegram.sendMessage(
                user.userId,
                `
                  💼 Wallet: ${wallet}
                  💰 Token: ${tokenDetails.token}
                  🔄 Type: ${
                    tradeType === "buy" ? "🟢 Buy" : "🔴 Sell"
                  } 💵 Amount: ${amount} 🔗 Transaction Hash: ${
                  tradeResult.transactionHash ?? "N/A"
                }
                `
              );

              await new Promise((resolve) => setTimeout(resolve, user.delay));
            } catch (error) {
              console.error(
                `Error placing order for user ${user.userId}:`,
                error.message
              );
            }
          }
        }
      } else {
        console.warn(`User ${user.userId} has no pairs defined.`);
      }
    }
  } catch (error) {
    console.error("Error during trading:", error.message);
  }
}

async function startTrading() {
  setInterval(trade, config.tradingParams.interval);
}

module.exports = {
  startTrading,
  bot,
};

// Function to generate a random trade amount within the specified limits
function getRandomAmount(min, max) {
  return Math.random() * (max - min) + min;
}
