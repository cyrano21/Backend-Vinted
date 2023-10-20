const mongoose = require("mongoose");

const User = mongoose.model("User", {
  email: {
    // unique : true permet de s'assurer que 2 users ne peuvent pas avoir le même email
    unique: true,
    type: String,
  },
  account: {
    username: {
      required: true,
      type: String,
    },
    avatar: Object,
  },
  newsletter: Boolean,
  token: String,
  hash: String,
  salt: String,

  isAdmin: {
    type: Boolean,
    default: false, // Par défaut, un utilisateur n'est pas administrateur
  },
});

module.exports = User;
