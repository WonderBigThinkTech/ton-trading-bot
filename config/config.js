module.exports = {
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
  },
  tradingParams: {
    minAmount: 0.01,
    maxAmount: 1.0,
    interval: 60000,
  },
  stonfi: {
    apiKey: process.env.STONFI_API_KEY,
    apiSecret: process.env.STONFI_API_SECRET,
  },
  admins: [process.env.ADMIN_ID],
};
