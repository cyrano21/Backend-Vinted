// Permet l'accès aux variables d'environnement
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const cloudinary = require("cloudinary").v2;
mongoose.set("strictQuery", false);

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

const corsOptions = {
  origin: "https://vinted-my.netlify.app",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};

app.use(cors(corsOptions));

// mongoose.connect(process.env.MONGODB_URI);
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
  // console.log(BASE_URL);
};
connectToDatabase();

// Connexion à l'espace de stockage cloudinary

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// cloudinary.config({
//   cloud_name: "lereacteur",
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

const bacUrl = process.env.REACT_APP_BACKEND_URL;
console.log(bacUrl);

const userRoutes = require("./routes/user");
const offerRoutes = require("./routes/offer");
const paymentRoutes = require("./routes/payment");
const dashboardRoutes = require("./routes/dashboard");
app.use(userRoutes);
app.use(offerRoutes);
app.use(paymentRoutes);
app.use(dashboardRoutes);

// const admin_token = process.env.REACT_APP_ADMIN_TOKEN;
// const webbb_token = process.env.REACT_WEB_TOKEN;

// console.log("index.token", admin_token);
// console.log("webbb_token", webbb_token);

app.get("/", (req, res) => {
  res.json("Bienvenue sur l'API de Vinted");
});

const server = app.listen(process.env.PORT || 4000, () => {
  console.log("Server started");
});
server.timeout = Number(process.env.SERVER_TIMEOUT) || 1000000;
