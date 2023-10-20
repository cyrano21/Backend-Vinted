// const User = require("../models/User");

// const isAuthenticated = async (req, res, next) => {
//   console.log("on rentre dans le middleware");

//   const admin_token = process.env.REACT_APP_ADMIN_TOKEN;
//   const webb_token = process.env.REACT_WEB_TOKEN;

//   try {
//     if (req.headers.authorization) {
//       const webToken = req.headers.authorization.replace("Bearer ", "");
//       console.log("token======>", webToken);

//       const token = "";
//       if (webToken === webb_token) {
//         admin_token = +token;
//       }
//       console.log("newToken", token);
//       new token.save();

//       // Vérifier le token
//       const user = await User.findOne({ token: token }).select(
//         "account _id isAdmin"
//       );
//       console.log("user====>", user);

//       if (user) {
//         req.user = user; // Mettre l'utilisateur dans req pour l'utiliser plus tard

//         if (user.isAdmin) {
//           // Cet utilisateur est un administrateur
//           // Vous pouvez ajouter des autorisations spéciales ici
//           console.log("user.isAdmin", user.isAdmin);
//         }

//         next();
//       } else {
//         // Si le jeton est incorrect ou expiré
//         res.status(401).json({ message: "Vous devez vous connecter" });
//       }
//     } else {
//       res.status(401).json({ message: "Vous devez vous connecter" });
//     }
//   } catch (error) {
//     // Si l'utilisateur est authentifié, mais qu'il y a un autre problème
//     res.status(400).json({
//       message:
//         "Un problème est survenu. Veuillez vous inscrire si vous n'avez pas encore de compte.",
//     });
//   }
// };

// module.exports = isAuthenticated;

const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  console.log("on rentre dans le middleware");

  const admin_token = process.env.REACT_APP_ADMIN_TOKEN;
  const webb_token = process.env.REACT_WEB_TOKEN;

  try {
    if (req.headers.authorization) {
      const webToken = req.headers.authorization.replace("Bearer ", "");
      console.log("token======>", webToken);

      let token = webToken; // Par défaut, utilisez le token reçu
      if (webToken === webb_token) {
        // Si le token reçu correspond au token de webb_token
        token = admin_token; // Changez le token en celui d'administrateur
      }

      // console.log("newToken", token);

      // Vérifiez le token
      const user = await User.findOne({ token: token }).select(
        "account _id isAdmin"
      );
      // console.log("user====>", user);

      if (user) {
        req.user = user; // Mettre l'utilisateur dans req pour l'utiliser plus tard

        if (user.isAdmin) {
          // Cet utilisateur est un administrateur
          // Vous pouvez ajouter des autorisations spéciales ici
          // console.log("user.isAdmin", user.isAdmin);
        }

        next();
      } else {
        // Si le jeton est incorrect ou expiré
        res.status(401).json({ message: "Vous devez vous connecter" });
      }
    } else {
      res.status(401).json({ message: "Vous devez vous connecter" });
    }
  } catch (error) {
    // Si l'utilisateur est authentifié, mais qu'il y a un autre problème
    res.status(400).json({
      message:
        "Un problème est survenu. Veuillez vous inscrire si vous n'avez pas encore de compte.",
    });
  }
};

module.exports = isAuthenticated;
