// Import du package 'express'
const express = require("express");
// Appel à la fonction Router(), issue du package 'express'
const router = express.Router();

// uid2 et crypto-js sont des packages qui vont nous servir à encrypter le mot de passe
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const isAuthentificated = require("../middleware/isAuthenticated");
// Middleware permettant de recevoir des formData
const fileUpload = require("express-fileupload");
// Fonction permettant de transformer un Buffer en Base64
// const convertToBase64 = require("../utils/convertToBase64");
// Import du package cloudinary
const cloudinary = require("cloudinary").v2;
const multer = require("multer");

// Package qui permet de générer des données aléatoires (ne pas en tenir compte, cela sert à réinitiliser la BDD entre 2 sessions de formation)
const { faker } = require("@faker-js/faker");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const owners = require("../data/owners.json");

// Import du model User et Offer
// afin d'éviter des erreurs (notamment dues à d'eventuelles références entre les collections)
// nous vous conseillons d'importer touts vos models dans toutes vos routes
//
// nous avons besoin de User pour effectuer une recherche dans la BDD
// afin de savoir :
// - si un utilisateur ayant le même email existe déjà ou pas (route signup)
// - quel est l'utilisateur qui souhaite se connecter (route login)
const User = require("../models/User");
const Offer = require("../models/Offer");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folderName; // Pour déterminer le nom du dossier basé sur l'email ou le nom d'utilisateur

    if (req.path === "/user/signup") {
      folderName = req.body.email || req.body.username;
    } else {
      // Pour les autres requêtes nécessitant une authentification
      const user = req.user;
      if (!user) {
        throw new Error("User not found");
      }
      folderName = user.email || user.account.username;
    }

    return {
      folder: `/vinted/users/${folderName}/avatar`,
      public_id: "avatar", // Cela écrasera l'avatar précédent si un utilisateur met à jour son avatar
    };
  },
});

const uploadAvatarToCloudinary = async (file, user) => {
  const folderName = user.email || user.account.username;
  const result = await cloudinary.uploader.upload(file.path, {
    folder: `/vinted/users/${folderName}/avatar`,
    public_id: "avatar",
  });

  return { secure_url: result.secure_url };
};

const parser = multer({ storage: storage });

router.post("/user/signup", parser.single("avatar"), async (req, res) => {
  try {
    const { username, email, password, newsletter } = req.body;
    // const avatar = req.file ? req.file.path : null; // Récupération de l'URL de l'avatar uploadé
    // console.log("avatar===>", avatar);

    if (username) {
      const user = await User.findOne({ email: email });

      if (user === null) {
        const salt = uid2(16);
        const token = uid2(16);
        const hash = SHA256(password + salt).toString(encBase64);

        // console.log("hash ====>", hash);

        const newUser = new User({
          email,
          account: {
            username,
          },
          newsletter,
          salt: salt,
          token: token,
          hash: hash,
        });

        const avatarInfo = await uploadAvatarToCloudinary(req.file, newUser);
        console.log("avatarInfo=====>", avatarInfo);
        newUser.account.avatar = avatarInfo;

        console.log(newUser);

        await newUser.save();
        console.log("User to be saved:=======>", newUser);

        res.status(200).json({
          _id: newUser._id,
          token: newUser.token,
          account: newUser.account,
        });
      } else {
        res.status(409).json({ error: "Unauthorized" });
      }
    } else {
      res.status(400).json({ error: "User not found" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/user/dashboard", isAuthentificated, async (req, res) => {
  try {
    const userId = req.user._id;
    // Récupérez l'utilisateur à partir de l'ID
    const user = await User.findById(userId).select("-hash -salt"); // Exclure le hash et le salt pour des raisons de sécurité

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    // Récupérez les offres (publications) de l'utilisateur
    const offers = await Offer.find({ owner: userId });

    // Renvoyer l'utilisateur et ses offres en réponse
    res.status(200).json({
      user,
      offers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  // console.log("route: /user/login");

  //   console.log(req.body);

  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email });

    if (user) {
      const newHash = SHA256(req.body.password + user.salt).toString(encBase64);
      // console.log(newHash);
      if (newHash === user.hash) {
        res.json({
          _id: user._id,
          token: user.token,
          account: user.account,
        });
      } else {
        res.status(401).json({ error: "Unauthorized" });
      }
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/user/updateToAdmin", isAuthentificated, async (req, res) => {
  try {
    const user = req.user;

    // Vérifiez si l'utilisateur a un nom d'utilisateur ou un email dans la requête
    if (req.body.username || req.body.email) {
      // Vous pouvez mettre à jour le champ isAdmin en fonction de votre logique
      user.isAdmin = true; // Vous pouvez définir cette valeur en fonction de votre logique

      // Enregistrez les modifications de l'utilisateur dans la base de données
      await user.save();

      return res
        .status(200)
        .json({ message: "User updated to admin successfully", user });
    } else {
      return res
        .status(400)
        .json({ message: "Missing username or email in the request" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error updating user to admin", error });
  }
});

router.put(
  "/user/update",
  isAuthentificated,
  parser.single("avatar"),
  async (req, res) => {
    // console.log(cloudinary.config());

    try {
      // const userId = req.user._id;
      const user = req.user;
      // const user = await User.findById(userId);

      if (user) {
        if (req.body.username) user.account.username = req.body.username;
        if (req.body.email) user.email = req.body.email;
        if (req.file) {
          user.account.avatar = await uploadAvatarToCloudinary(req.file, user);
          await user.save();
        }

        res.status(200).json({ message: "User updated successfully", user });
      } else {
        res.status(400).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.get("/user/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // Trouver l'utilisateur par ID
    const user = await User.findById(userId).select("-hash -salt"); // Exclure le hash et le salt pour des raisons de sécurité

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    // Trouver toutes les offres (publications) associées à cet utilisateur
    const offer = await Offer.find({ owner: userId });

    // Renvoyer l'utilisateur et ses offres en réponse
    res.status(200).json({
      user,
      offer,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/reset-users", async (req, res) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.replace("Bearer ", "");

    if (token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: "Unauthorized" });
    } else {
      // On supprime les images, cloudinary ne permettant pas de supprimer des dossiers qui ne sont pas vides
      try {
        const deleteResources = await cloudinary.api.delete_resources_by_prefix(
          "api/vinted-v2/users"
        );
      } catch (error) {
        console.log(error);
        return res.status(400).json({ message: error.message });
      }
      // On supprime les dossier qui sont maintenant vides
      try {
        const users = await User.find();

        const folderDeletionPromise = users.map((user) => {
          return cloudinary.api.delete_folder(`/vinted/users/${user._id}`);
        });
        await Promise.all(folderDeletionPromise);
        // Vider la collection User
        await User.deleteMany({});
      } catch (error) {
        return res.status(500).json({ message: error.message });
      }

      // Créer les users

      // Admin User
      try {
        const token = uid2(64);
        const salt = uid2(64);
        const hash = SHA256("Figoro21" + salt).toString(encBase64);

        const adminUser = new User({
          email: "louiscyrano@gmail.com",
          token: token,
          hash: hash,
          salt: salt,
          account: {
            username: "Louiscyrano",
          },
        });

        // uploader la photo de profile de l'admin user
        // console.log("🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥");

        const resultImage = await cloudinary.uploader.upload(
          faker.image.avatar(),
          {
            folder: `/vinted/users/${folderName}/avatar`,
            public_id: "avatar", //
          }
        );

        adminUser.account.avatar = resultImage;
        // sauvegarder l'admin user dans la BDD
        await adminUser.save();
      } catch (error) {
        return res
          .status(500)
          .json({ error: "Error when creating admin user : " + error.message });
      }
      // Tableau contenant les users en attente de sauvegarde
      const userTab = [];
      // Tableau contenant les promesses des uploads sur cloudinary
      const profilePicturesTabPromises = [];
      // Random Users
      for (let i = 0; i < 21; i++) {
        try {
          // Étape 1 : encrypter le mot de passe
          // Générer le token et encrypter le mot de passe
          const token = uid2(64);
          const salt = uid2(64);
          const hash = SHA256("azerty" + salt).toString(encBase64);

          // Étape 2 : créer le nouvel utilisateur
          const newUser = new User({
            email: faker.internet.email().toLowerCase(),
            token: token,
            hash: hash,
            salt: salt,
            account: {
              username: faker.internet.userName(),
            },
          });
          // On push tous les users dans le tableau
          userTab.push(newUser);

          // Étape 3 : uploader la photo de profile du user

          // On push dans ce tableau les promesses d'upload
          profilePicturesTabPromises.push(
            cloudinary.uploader.upload(faker.image.avatar(), {
              folder: `/vinted/users/${folderName}/avatar`,
              public_id: "avatar", //
            })
          );
        } catch (error) {
          return res.status(500).json({ message: error.message });
        }
      }
      // On attend la résolution des upload et on a les resultats dans ce tableau
      const profilePicturesTabPromisesResult = await Promise.all(
        profilePicturesTabPromises
      );

      // On parcourt le tableau de user et on leurs assigne à chacun une url renvoyée par cloudinary
      for (let j = 0; j < userTab.length; j++) {
        userTab[j].account.avatar = profilePicturesTabPromisesResult[j];
      }

      // On crée un tableau de promesse de sauvegarde des users
      const userSavePromises = userTab.map((user) => {
        return user.save();
      });

      // On attend qu'ils sonient tous sauvegardés
      await Promise.all(userSavePromises);

      res.status(200).json("🍺 All users saved !");
    }
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
});

module.exports = router;

// // déclaration de la route signup, utilisation de fileUpload pour réceptionner des formData
// router.post("/user/signup", fileUpload(), async (req, res) => {
//   try {
//     // Recherche dans la BDD. Est-ce qu'un utilisateur possède cet email ?
//     const user = await User.findOne({ email: req.body.email });

//     // Si oui, on renvoie un message et on ne procède pas à l'inscription
//     if (user) {
//       res.status(409).json({ message: "This email already has an account" });

//       // sinon, on passe à la suite...
//     } else {
//       // l'utilisateur a-t-il bien envoyé les informations requises ?
//       if (req.body.email && req.body.password && req.body.username) {
//         // Si oui, on peut créer ce nouvel utilisateur

//         // Étape 1 : encrypter le mot de passe
//         // Générer le token et encrypter le mot de passe
//         const token = uid2(64);
//         const salt = uid2(64);
//         const hash = SHA256(req.body.password + salt).toString(encBase64);

//         // Étape 2 : créer le nouvel utilisateur
//         const newUser = new User({
//           email: req.body.email,
//           token: token,
//           hash: hash,
//           salt: salt,
//           account: {
//             username: req.body.username,
//           },
//           newsletter: req.body.newsletter,
//         });

//         // Si je reçois une image, je l'upload sur cloudinary et j'enregistre le résultat dans la clef avatar de la clef account de mon nouvel utilisateur
//         if (req.files?.avatar) {
//           const result = await cloudinary.uploader.upload(
//             convertToBase64(req.files.avatar),
//             {
//               folder: `api/vinted-v2/users/${newUser._id}`,
//               public_id: "avatar",
//             }
//           );
//           newUser.account.avatar = result;
//         }

//         // Étape 3 : sauvegarder ce nouvel utilisateur dans la BDD
//         await newUser.save();
//         res.status(201).json({
//           _id: newUser._id,
//           email: newUser.email,
//           token: newUser.token,
//           account: newUser.account,
//         });
//       } else {
//         // l'utilisateur n'a pas envoyé les informations requises ?
//         res.status(400).json({ message: "Missing parameters" });
//       }
//     }
//   } catch (error) {
//     console.log(error.message);
//     res.status(500).json({ message: error.message });
//   }
// });

// router.post("/user/login", async (req, res) => {
//   try {
//     const user = await User.findOne({ email: req.body.email });

//     if (user) {
//       // Est-ce qu'il a rentré le bon mot de passe ?
//       // req.body.password
//       // user.hash
//       // user.salt
//       if (
//         SHA256(req.body.password + user.salt).toString(encBase64) === user.hash
//       ) {
//         res.status(200).json({
//           _id: user._id,
//           token: user.token,
//           account: user.account,
//         });
//       } else {
//         res.status(401).json({ error: "Unauthorized" });
//       }
//     } else {
//       res.status(400).json({ message: "User not found" });
//     }
//   } catch (error) {
//     console.log(error.message);
//     res.status(500).json({ message: error.message });
//   }
// });

// // CETTE ROUTE SERT AU RESET DE LA BDD ENTRE 2 SESSIONS DE FORMATION. CELA NE FAIT PAS PARTIE DE L'EXERCICE.
// router.get("/reset-users", async (req, res) => {
//   if (req.headers.authorization) {
//     const token = req.headers.authorization.replace("Bearer ", "");

//     if (token !== process.env.ADMIN_TOKEN) {
//       return res.status(401).json({ error: "Unauthorized" });
//     } else {
//       // On supprime les images, cloudinary ne permettant pas de supprimer des dossiers qui ne sont pas vides
//       try {
//         const deleteResources = await cloudinary.api.delete_resources_by_prefix(
//           "api/vinted-v2/users"
//         );
//       } catch (error) {
//         console.log(error);
//         return res.status(400).json({ message: error.message });
//       }
//       // On supprime les dossier qui sont maintenant vides
//       try {
//         const users = await User.find();

//         const folderDeletionPromise = users.map((user) => {
//           return cloudinary.api.delete_folder(
//             `/api/vinted-v2/users/${user._id}`
//           );
//         });
//         await Promise.all(folderDeletionPromise);
//         // Vider la collection User
//         await User.deleteMany({});
//       } catch (error) {
//         return res.status(500).json({ message: error.message });
//       }

//       // Créer les users

//       // Admin User
//       try {
//         const token = uid2(64);
//         const salt = uid2(64);
//         const hash = SHA256("Figoro21" + salt).toString(encBase64);

//         const adminUser = new User({
//           email: "louiscyrano@gmail.com",
//           token: token,
//           hash: hash,
//           salt: salt,
//           account: {
//             username: "Louiscyrano",
//           },
//         });

//         // uploader la photo de profile de l'admin user
//         // console.log("🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥");

//         const resultImage = await cloudinary.uploader.upload(
//           faker.image.avatar(),
//           {
//             folder: `api/vinted-v2/users/${adminUser._id}`,
//             public_id: "avatar",
//           }
//         );

//         adminUser.account.avatar = resultImage;
//         // sauvegarder l'admin user dans la BDD
//         await adminUser.save();
//       } catch (error) {
//         return res
//           .status(500)
//           .json({ error: "Error when creating admin user : " + error.message });
//       }
//       // Tableau contenant les users en attente de sauvegarde
//       const userTab = [];
//       // Tableau contenant les promesses des uploads sur cloudinary
//       const profilePicturesTabPromises = [];
//       // Random Users
//       for (let i = 0; i < 21; i++) {
//         try {
//           // Étape 1 : encrypter le mot de passe
//           // Générer le token et encrypter le mot de passe
//           const token = uid2(64);
//           const salt = uid2(64);
//           const hash = SHA256("azerty" + salt).toString(encBase64);

//           // Étape 2 : créer le nouvel utilisateur
//           const newUser = new User({
//             email: faker.internet.email().toLowerCase(),
//             token: token,
//             hash: hash,
//             salt: salt,
//             account: {
//               username: faker.internet.userName(),
//             },
//           });
//           // On push tous les users dans le tableau
//           userTab.push(newUser);

//           // Étape 3 : uploader la photo de profile du user

//           // On push dans ce tableau les promesses d'upload
//           profilePicturesTabPromises.push(
//             cloudinary.uploader.upload(faker.image.avatar(), {
//               folder: `api/vinted-v2/users/${newUser._id}`,
//               public_id: "avatar",
//             })
//           );
//         } catch (error) {
//           return res.status(500).json({ message: error.message });
//         }
//       }
//       // On attend la résolution des upload et on a les resultats dans ce tableau
//       const profilePicturesTabPromisesResult = await Promise.all(
//         profilePicturesTabPromises
//       );

//       // On parcourt le tableau de user et on leurs assigne à chacun une url renvoyée par cloudinary
//       for (let j = 0; j < userTab.length; j++) {
//         userTab[j].account.avatar = profilePicturesTabPromisesResult[j];
//       }

//       // On crée un tableau de promesse de sauvegarde des users
//       const userSavePromises = userTab.map((user) => {
//         return user.save();
//       });

//       // On attend qu'ils sonient tous sauvegardés
//       await Promise.all(userSavePromises);

//       res.status(200).json("🍺 All users saved !");
//     }
//   } else {
//     res.status(401).json({ error: "Unauthorized" });
//   }
// });

// module.exports = router;
