// Importez les modules nécessaires
const mongoose = require("mongoose");
const User = require("./models/User"); // Assurez-vous d'importer correctement votre modèle User
mongoose.set("strictQuery", true);
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

// Définissez l'adresse e-mail de l'utilisateur à mettre à jour
const userEmailToUpdate = "louiscyrano@gmail.com";

// Mettez à jour l'utilisateur existant pour lui attribuer le rôle d'administrateur
User.updateOne(
  { email: userEmailToUpdate }, // Filtre pour trouver l'utilisateur à mettre à jour
  { $set: { isAdmin: true } } // Mettez à jour le champ isAdmin à true
)
  .then((result) => {
    if (result.nModified === 1) {
      console.log(
        "L'utilisateur a été mis à jour avec succès pour devenir administrateur."
      );
    } else {
      console.log(
        "Aucun utilisateur n'a été mis à jour. L'utilisateur n'a pas été trouvé."
      );
    }
    // Fermez la connexion à la base de données si nécessaire
    // mongoose.connection.close();
  })
  .catch((error) => {
    console.error("Erreur lors de la mise à jour de l'utilisateur :", error);
    // Fermez la connexion à la base de données si nécessaire
    // mongoose.connection.close();
  });
