const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: { type: Number, unique: true, required: true },
  pairs: {
    type: Map,
    of: {
      token: String,
      minAmount: Number,
      maxAmount: Number,
      exchange: { type: String, default: "dedust" },
      delay: { type: Number, default: 1000 },
    },
  },
  activePairs: [String],
  tradingLimits: {
    min: { type: Number, default: 1 },
    max: { type: Number, default: 100 },
  },
  delay: { type: Number, default: 1000 },
  exchange: { type: String, default: "dedust" },
  rental: {
    enabled: { type: Boolean, default: false },
    expiry: { type: Date, default: null },
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
