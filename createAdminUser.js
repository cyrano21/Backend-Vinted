const mongoose = require("mongoose");
const User = require("./models/User");

require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log("MONGODB_URI:", MONGODB_URI);

const connectToDatabase = () => {
  try {
    mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("connected to MongoDB");
  } catch (error) {
    console.error("Could not connect to MongoDB", error);
  }
};
connectToDatabase();
// Connectez-vous à la base de données ici si ce n'est pas déjà fait

// Créez l'utilisateur administrateur
const adminUser = new User({
  email: "louiscyrano@gmail.com",
  account: {
    username: "admin",
  },
  newsletter: false,
  token: "e71KvwP11G-SqMWF",
  hash: "3Ql1y1KbKGHesUir0Zaep4E/RM4vVwBg4kR23KTbwyw",
  salt: "t8k2SdTmIKbS07Qx",
  isAdmin: true,
});

// Enregistrez le nouvel utilisateur dans la base de données
adminUser
  .save()
  .then((user) => {
    console.log("Utilisateur administrateur créé :", user);
  })
  .catch((error) => {
    console.error("Erreur lors de la création de l'utilisateur :", error);
  });
