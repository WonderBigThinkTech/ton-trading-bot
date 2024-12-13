const { mnemonicToWalletKey, mnemonicValidate } = require("@ton/crypto");
const TonWeb = require("tonweb");
const macaddress = require("macaddress");

TonWeb.utils.Address;

function getRandomAmount(min, max) {
  return Math.random() * (min - max) + min;
}

function isValidAddress(address) {
  try {
    const tonAddress = new TonWeb.utils.Address(address);
    return tonAddress.isUserFriendly && address.length === 48;
  } catch (e) {
    return false;
  }
}

async function transferFunds(privateKey, publicKey, toWallet, amount) {
  try {
    const tonweb = new TonWeb(
      new TonWeb.HttpProvider("https://toncenter.com/api/v2/jsonRPC", {
        apiKey:
          "cd6feca92500c9251f4fb40c9d96c1a21978522c29c95c04e3f7453382736145",
      })
    );

    const wallet = tonweb.wallet.create({
      publicKey: publicKey,
      wc: 0,
    });

    let seqno = await wallet.methods.seqno().call();
    console.log(`Seqno: ${seqno}`);

    if (typeof seqno !== "number" || seqno < 0) {
      seqno = 0; // Ensure seqno is properly initialized
    }

    await wallet.methods
      .transfer({
        secretKey: privateKey,
        toAddress: toWallet,
        amount: TonWeb.utils.toNano(amount), // Convert amount to nanoTONs
        seqno: seqno,
        sendMode: 3,
      })
      .send();

    console.log(`Transferred ${amount} TON from wallet to ${toWallet}.`);
  } catch (error) {
    console.error(`Error transferring funds: ${error.message}`);
    throw new Error(`Error transferring funds: ${error.message}`);
  }
}

async function getWalletKeyFromMnemonic(mnemonic) {
  try {
    console.log(`Converting mnemonic to private key. Mnemonic: ${mnemonic}`);
    const mnemonicArray = mnemonic.trim().split(" ");
    if (mnemonicArray.length < 12) {
      throw new Error("Mnemonic should have at least 12 words");
    }
    console.log(`Mnemonic array: ${mnemonicArray}`);
    const key = await mnemonicToWalletKey(mnemonicArray);
    console.log(`Derived key pair: ${key}`);
    return key;
  } catch (error) {
    console.error(`Error converting mnemonic to wallet key: ${error.message}`);
    throw error;
  }
}

function validateMnemonic(mnemonic) {
  try {
    console.log(`Validating mnemonic: ${mnemonic}`);
    const mnemonicArray = mnemonic.trim().split(" ");
    const isValid = mnemonicValidate(mnemonicArray);
    console.log(`Mnemonic valid: ${isValid}`);
    return isValid;
  } catch (error) {
    console.error(`Error validating mnemonic: ${error.message}`);
    return false;
  }
}

module.exports = {
  getRandomAmount,
  isValidAddress,
  transferFunds,
  getWalletKeyFromMnemonic,
  validateMnemonic,
};
