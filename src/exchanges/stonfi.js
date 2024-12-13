const { StonApiClient } = require("@ston-fi/api");
const axios = require("axios");

// Initialize the client
const client = new StonApiClient({
  baseURL: "https://api.stonfi.io",
});

async function checkTonBalance(wallet) {
  try {
    const response = await axios.get(
      `https://tonscan.org/api/v1/user/${wallet}`
    );
    const balance = response.data.balance;
    return balance;
  } catch (error) {
    console.error("Error checking TON balance:", error);
    throw error;
  }
}

async function checkTokenExistence(token) {
  try {
    const response = await axios.get(
      `https://tonscan.org/api/v1/token/${token}`
    );
    return response.data.exists;
  } catch (error) {
    console.error("Error checking token existence:", error);
    throw error;
  }
}

async function placeOrder(wallet, assetIn, assetOut, amount, type) {
  try {
    const swapSimulation =
      type === "buy"
        ? await client.simulateReverseSwap({
            assetIn: assetOut,
            assetOut: assetIn,
            amountIn: amount,
            walletAddress: wallet,
          })
        : await client.simulateSwap({
            assetIn: assetIn,
            assetOut: assetOut,
            amountIn: amount,
            walletAddress: wallet,
          });
    return swapSimulation;
  } catch (error) {
    console.error("Error placing Stonfi order:", error);
    throw error;
  }
}

module.exports = {
  placeOrder,
  checkTonBalance,
  checkTokenExistence,
};
