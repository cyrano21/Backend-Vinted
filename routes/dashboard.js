const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Offer = require("../models/Offer");
const isAuthenticated = require("../middleware/isAuthenticated");

// Route pour le tableau de bord de l'utilisateur
router.get("/dashboard", isAuthenticated, async (req, res) => {
  console.log("Route /dashboard atteinte.");

  try {
    // Récupérer l'utilisateur actuel
    const user = req.user;

    if (user) {
      // Récupérer les offres de l'utilisateur
      const offers = await Offer.find({ owner: user._id });
      //   console.log("offers====>", offers);

      res.status(200).json({ user, offers });
    } else {
      res.status(401).json({ message: "Vous devez vous connecter" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route pour mettre à jour les données de connexion (nom d'utilisateur, email, avatar, etc.)
router.put("/dashboard/update", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { username, email } = req.body;

    // Récupérer l'utilisateur
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Mettre à jour les données de connexion
    if (username) user.account.username = username;
    if (email) user.email = email;

    // Sauvegarder les modifications
    await user.save();

    res
      .status(200)
      .json({ message: "Données de connexion mises à jour avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route pour modifier le mot de passe
router.put("/dashboard/updatePassword", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;

    // Récupérer l'utilisateur
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Vérifier l'ancien mot de passe
    const oldHash = req.user.hash;
    const oldSalt = req.user.salt;
    const oldPasswordHash = crypto
      .pbkdf2Sync(oldPassword, oldSalt, 1000, 64, "sha512")
      .toString("hex");

    if (oldHash !== oldPasswordHash) {
      return res.status(401).json({ error: "Mot de passe incorrect" });
    }

    // Générer un nouveau sel et le nouveau mot de passe
    const newSalt = crypto.randomBytes(16).toString("hex");
    const newPasswordHash = crypto
      .pbkdf2Sync(newPassword, newSalt, 1000, 64, "sha512")
      .toString("hex");

    // Mettre à jour le sel et le mot de passe
    user.salt = newSalt;
    user.hash = newPasswordHash;

    // Sauvegarder les modifications
    await user.save();

    res.status(200).json({ message: "Mot de passe modifié avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
