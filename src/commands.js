// commands.js

const User = require("./models/User");
const {
  getPrivateKeyFromMnemonic,
  getPublicKeyFromPrivateKey,
  transferFunds,
  isValidAddress,
  validateMnemonic,
  getWalletKeyFromMnemonic,
} = require("./utils");

const { startTrading } = require("./bot"); // Adjust the path if necessary

async function addPair(ctx, userId, contractAddress) {
  try {
    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({
        userId,
        pairs: {},
        activePairs: [],
        tradingLimits: { min: 1, max: 100 },
        delay: 1000,
        exchange: "dedust",
      });
    }

    if (!isValidAddress(contractAddress)) {
      await ctx.reply(`⚠️ Invalid contract address ${contractAddress}.`);
      return;
    }

    user.pairs[contractAddress] = { contractAddress };
    await user.save();
    await ctx.reply(
      `✅ Pair added successfully:\n- Contract Address: ${contractAddress}`
    );
  } catch (error) {
    console.error(`Error adding pair for user ${userId}:`, error.message);
    await ctx.reply(`⚠️ Error adding pair, please try again.`);
  }
}

async function removePair(ctx, userId, wallet) {
  try {
    const user = await User.findOne({ userId });
    if (user && user.pairs.has(wallet)) {
      user.pairs.delete(wallet);
      const index = user.activePairs.indexOf(wallet);
      if (index > -1) {
        user.activePairs.splice(index, 1);
      }
      await user.save();
      await ctx.reply(`❌ Pair removed:\n- Wallet: ${wallet}`);
    } else {
      await ctx.reply(`⚠️ Pair not found.`);
    }
  } catch (error) {
    console.error(`Error removing pair for user ${userId}:`, error.message);
    await ctx.reply(`⚠️ Error removing pair, please try again.`);
  }
}

async function listPairs(ctx, userId) {
  try {
    const user = await User.findOne({ userId });
    if (!user || user.pairs.size === 0) {
      await ctx.reply("🚫 No pairs defined.");
    } else {
      let pairsList = "📄 Current pairs:\n";
      for (let [wallet, details] of user.pairs.entries()) {
        pairsList += `💼 Wallet: ${wallet}\n💰 Token: ${details.token}\nMin: ${details.minAmount}\nMax: ${details.maxAmount}\n------------------\n`;
      }
      await ctx.reply(pairsList);
    }
  } catch (error) {
    console.error(`Error listing pairs for user ${userId}:`, error.message);
    await ctx.reply(`⚠️ Error retrieving pairs, please try again.`);
  }
}

async function setExchange(ctx, userId, exchange) {
  try {
    if (!["dedust", "stonfi"].includes(exchange)) {
      await ctx.reply("Invalid exchange. Use 'dedust' or 'stonfi'.");
      return;
    }

    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId, pairs: {}, activePairs: [], exchange });
    } else {
      user.exchange = exchange;
    }

    await user.save();
    await ctx.reply(`🌐 Exchange set to ${exchange}. Happy trading!`);
  } catch (error) {
    console.error(`Error setting exchange for user ${userId}:`, error.message);
    await ctx.reply(`⚠️ Error setting exchange, please try again.`);
  }
}

async function setTradingLimits(ctx, userId, min, max) {
  try {
    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({
        userId,
        pairs: {},
        activePairs: [],
        tradingLimits: { min, max },
      });
    } else {
      user.tradingLimits = { min, max };
    }

    await user.save();
    await ctx.reply(`🔢 Trading limits set:\n- Min: ${min}\n- Max: ${max}`);
  } catch (error) {
    console.error(
      `Error setting trading limits for user ${userId}:`,
      error.message
    );
    await ctx.reply(`⚠️ Error setting limits, please try again.`);
  }
}

async function setDelay(ctx, userId, delay) {
  try {
    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId, pairs: {}, activePairs: [], delay });
    } else {
      user.delay = delay;
    }
    await user.save();
    await ctx.reply(`⏱ Delay is now set to ${delay} milliseconds.`);
  } catch (error) {
    console.error(`Error setting delay for user ${userId}:`, error.message);
    await ctx.reply(`⚠️ Error setting delay, please try again.`);
  }
}

async function showHelp(ctx) {
  const helpMessage = `
🛠️ Available commands:
/addpair <contractAddress> - Adds a contract address.
/removepair <wallet> - Removes a wallet.
/pairs - Lists all pairs.
/startpair <wallet> - Starts trading for a specific wallet.
/stoppair <wallet> - Stops trading for a specific wallet.
/status - Shows the status of all active trading pairs.
/setexchange <dedust|stonfi> - Sets the exchange to be used.
/setlimits <min> <max> - Sets the trading limits.
/setdelay <milliseconds> - Sets the delay between each transaction.
/createWallets "<mnemonic>" <number> - Creates a specified number of TON wallets.
/transfer <external_wallet_address> - Transfers funds from created wallets to an external wallet.
/setrentalstatus <enable|disable> - Enable or disable the rental status.
/setrentaltime <user_id> <expiry_date> - Set the rental expiry time.
/setrentalamount <amount> - Set the rental payment amount.
/setrentalwallet <wallet_address> - Set the rental wallet address.
/fundwallets <funding_wallet_address> <amount> - Funds all created wallets with a specified amount.
/help - Shows this help message.
  `;
  await ctx.reply(helpMessage);
}

async function startPair(ctx, userId, wallet) {
  try {
    const user = await User.findOne({ userId });
    if (user && user.pairs && user.pairs[wallet]) {
      if (!Array.isArray(user.activePairs)) {
        user.activePairs = [];
      }
      user.activePairs.push(wallet);
      await user.save();
      await ctx.reply(`🎉 Trading started for wallet: ${wallet}`);
    } else {
      await ctx.reply(`⚠️ Pair not found.`);
    }
  } catch (error) {
    console.error(`Error starting pair for user ${userId}:`, error.message);
    await ctx.reply(`⚠️ Error starting pair, please try again.`);
  }
}

async function stopPair(ctx, userId, wallet) {
  try {
    const user = await User.findOne({ userId });
    if (
      user &&
      Array.isArray(user.activePairs) &&
      user.activePairs.includes(wallet)
    ) {
      const index = user.activePairs.indexOf(wallet);
      if (index > -1) {
        user.activePairs.splice(index, 1);
      }
      await user.save();
      await ctx.reply(`🛑 Trading stopped for wallet: ${wallet}`);
    } else {
      await ctx.reply(`⚠️ Pair not found or not active.`);
    }
  } catch (error) {
    console.error(`Error stopping pair for user ${userId}:`, error.message);
    await ctx.reply(`⚠️ Error stopping pair, please try again.`);
  }
}

async function statusPairs(ctx, userId) {
  try {
    const user = await User.findOne({ userId });
    if (!user) {
      await ctx.reply("🚫 No user found.");
    } else if (
      !Array.isArray(user.activePairs) ||
      user.activePairs.length === 0
    ) {
      await ctx.reply("🚫 No active pairs.");
    } else {
      let statusList = "⚙️ Active pairs:\n";
      for (let wallet of user.activePairs) {
        const details = user.pairs[wallet];
        statusList += `💼 Wallet: ${wallet}\n💰 Token: ${details.contractAddress}\n`;
      }
      await ctx.reply(statusList);
    }
  } catch (error) {
    console.error(`Error retrieving status for user ${userId}:`, error.message);
    await ctx.reply(`⚠️ Error retrieving status, please try again.`);
  }
}

async function createWallets(
  ctx,
  userId,
  numberOfWallets,
  createWalletFunc,
  mnemonic
) {
  try {
    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId, pairs: {}, activePairs: [] });
    }

    const newWallets = await createWalletFunc(mnemonic, numberOfWallets);

    newWallets.forEach((wallet) => {
      user.pairs[wallet.address] = {
        contractAddress: null,
        privateKey: wallet.privateKey,
      };
    });
    await user.save();
    await ctx.reply(
      `✅ Created ${numberOfWallets} new wallets:\n${newWallets
        .map((wallet) => wallet.address)
        .join("\n")}`
    );
  } catch (error) {
    console.error(`Error creating wallets for user ${userId}:`, error.message);
    await ctx.reply(`⚠️ Error creating wallets, please try again.`);
  }
}

async function transferToExternalWallet(ctx, userId, externalWalletAddress) {
  try {
    const user = await User.findOne({ userId });
    if (!user || Object.keys(user.pairs).length === 0) {
      await ctx.reply("🚫 No pairs defined.");
      return;
    }

    for (let walletAddress in user.pairs) {
      const walletDetails = user.pairs[walletAddress];
      const privateKey = walletDetails.privateKey;

      if (!privateKey) {
        await ctx.reply(`⚠️ No private key found for wallet ${walletAddress}.`);
        continue;
      }

      try {
        await transferFunds(privateKey, externalWalletAddress, 10);
        await ctx.reply(
          `✅ Funds transferred from ${walletAddress} to ${externalWalletAddress}.`
        );
      } catch (transferError) {
        console.error(
          `Error transferring from ${walletAddress} to ${externalWalletAddress}:`,
          transferError.message
        );
        await ctx.reply(`⚠️ Failed to transfer from ${walletAddress}.`);
      }
    }
  } catch (error) {
    console.error(
      `Error transferring funds for user ${userId}:`,
      error.message
    );
    await ctx.reply(`⚠️ Error transferring funds, please try again.`);
  }
}

async function setRentalStatus(ctx, enable) {
  try {
    const userId = ctx.from.id;
    const user = await User.findOne({ userId });
    if (!user) {
      await ctx.reply("🚫 User not found.");
      return;
    }

    user.rental.enabled = enable;
    await user.save();
    await ctx.reply(`Rental status ${enable ? "enabled" : "disabled"}.`);
  } catch (error) {
    console.error(
      `Error setting rental status for user ${userId}:`,
      error.message
    );
    await ctx.reply(`⚠️ Error setting rental status, please try again.`);
  }
}

async function setRentalExpiry(ctx, userId, expiryDate) {
  try {
    const user = await User.findOne({ userId });
    if (!user) {
      await ctx.reply("🚫 User not found.");
      return;
    }

    user.rental.expiry = expiryDate;
    await user.save();
    await ctx.reply(`Rental expiry date set to ${expiryDate}.`);
  } catch (error) {
    console.error(
      `Error setting rental expiry for user ${userId}:`,
      error.message
    );
    await ctx.reply(`⚠️ Error setting rental expiry, please try again.`);
  }
}

async function setRentalPaymentAmount(ctx, userId, amount) {
  try {
    const user = await User.findOne({ userId });
    if (!user) {
      await ctx.reply("🚫 User not found.");
      return;
    }

    user.rental.paymentAmount = amount;
    await user.save();
    await ctx.reply(`Rental payment amount set to ${amount} USDT.`);
  } catch (error) {
    console.error(
      `Error setting rental payment amount for user ${userId}:`,
      error.message
    );
    await ctx.reply(
      `⚠️ Error setting rental payment amount, please try again.`
    );
  }
}

async function setRentalWalletAddress(ctx, userId, address) {
  try {
    if (!isValidAddress(address)) {
      await ctx.reply(`⚠️ Invalid wallet address ${address}.`);
      return;
    }

    const user = await User.findOne({ userId });
    if (!user) {
      await ctx.reply("🚫 User not found.");
      return;
    }

    user.rental.walletAddress = address;
    await user.save();
    await ctx.reply(`Rental payment wallet address set to ${address}.`);
  } catch (error) {
    console.error(
      `Error setting rental payment wallet address for user ${userId}:`,
      error.message
    );
    await ctx.reply(
      `⚠️ Error setting rental payment wallet address, please try again.`
    );
  }
}

// inherit wheat ecology network shove fame chunk awkward main lawsuit omit curtain obey young aspect silly lyrics electric chicken panic spread boat trial gorilla

async function fundAllWallets(ctx, userId, fundingAddress, amount) {
  try {
    const user = await User.findOne({ userId });
    if (!user || Object.keys(user.pairs).length === 0) {
      await ctx.reply("🚫 No wallets found to fund.");
      return;
    }

    const mnemonic =
      "inherit wheat ecology network shove fame chunk awkward main lawsuit omit curtain obey young aspect silly lyrics electric chicken panic spread boat trial gorilla";

    console.log(`Validating mnemonic: ${mnemonic}`);
    if (!validateMnemonic(mnemonic)) {
      await ctx.reply("🚫 Invalid mnemonic.");
      return;
    }

    console.log("Mnemonic validated successfully.");

    const { secretKey: privateKey, publicKey } = await getWalletKeyFromMnemonic(
      mnemonic
    );
    console.log(`Derived private key: ${privateKey.toString("hex")}`);
    console.log(`Derived public key: ${publicKey.toString("hex")}`);

    for (let wallet of Object.keys(user.pairs)) {
      if (!isValidAddress(wallet)) {
        console.error(`Invalid address: ${wallet}`);
        await ctx.reply(`🚫 Invalid address encountered: ${wallet}`);
        continue;
      }

      try {
        await transferFunds(privateKey, publicKey, wallet, amount.toString());
        await ctx.reply(
          `✅ ${amount} transferred from ${fundingAddress} to ${wallet}.`
        );
      } catch (transferError) {
        console.error(
          `❌ Error transferring funds to ${wallet}:`,
          transferError.message
        );
        await ctx.reply(
          `⚠️ Failed to transfer funds to ${wallet}. Check logs for details.`
        );
      }
    }
  } catch (error) {
    console.error(
      `❌ Error funding wallets for user ${userId}:`,
      error.message
    );
    await ctx.reply(
      `⚠️ Error funding wallets, please try again. Check logs for details.`
    );
  }
}

async function startFreeTrial(ctx) {
  const userId = ctx.from.id;
  const macAddress = await getMacAddress(); // Capture MAC address

  const user = await User.findOne({ userId });
  if (!user) {
    await ctx.reply(`🚫 No user found.`);
    return;
  }

  if (await checkMacAddress(macAddress)) {
    await ctx.reply(`⚠️ You have already used the free trial.`);
    return;
  }

  // Update user state with trial period and expiry
  user.trial = { macAddress, expiry: Date.now() + 30 * 60 * 1000 }; // 30 minutes from now
  await user.save();

  await ctx.reply(`✅ Free trial started! You have 30 minutes of free usage.`);

  // Start trading logic for the trial period
  startTrading(user);
}

async function checkMacAddress(macAddress) {
  const existingUser = await User.findOne({ "trial.macAddress": macAddress });
  return !!existingUser;
}

module.exports = {
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
};
