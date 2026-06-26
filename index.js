import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

import authMiddleware from "./middleware/auth.middleware.js";
import checkRoleMiddleware from "./middleware/role.middleware.js";
import asyncHandler from "./utils/asyncHandler.js";

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
const port = process.env.PORT || 5000;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let  userCollection;

async function run() {
  try {
    await client.connect();

    const db = client.db("roktoneer");
    userCollection = db.collection("user");

    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running fine!");
});

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server is running on ${port}`);
  });
}

export default app;