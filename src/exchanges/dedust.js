const dedust = require("@dedust/sdk");
const axios = require("axios");

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

async function placeOrder(wallet, token, amount, type) {
  try {
    if (!dedust.scaleWallet) {
      throw new Error("dedust.scaleWallet is undefined");
    }

    const order = await dedust.scaleWallet.sendTransfer(
      wallet,
      dedust.toNano(amount),
      {
        amount: amount,
        destination: dedust.scaleVault?.address || "defaultVaultAddress",
        responseAddress: wallet,
        forwardAmount: dedust.toNano("0.25"),
        forwardPayload:
          dedust.VaultJetton?.createSwapPayload({
            poolAddress: dedust.TON_SCALE?.address || "defaultPoolAddress1",
            limit: dedust.minimalAmountOut || 0,
            next: {
              poolAddress: dedust.TON_BOLT?.address || "defaultPoolAddress2",
            },
          }) || {},
      }
    );

    return order;
  } catch (error) {
    console.error("Error placing Dedust order:", error);
    throw error;
  }
}

module.exports = {
  placeOrder,
  checkTonBalance,
  checkTokenExistence,
};
