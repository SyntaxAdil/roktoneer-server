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

let userCollection;

async function run() {
  try {
    await client.connect();

    const db = client.db("roktoneer");
    // collections
    userCollection = db.collection("user");
    donationRequestsCollection = db.collection("donationRequests");

    // API'S

    // API for blood request

    // Donation request create
    app.post(
      "/api/donation-request",
      authMiddleware,
      checkRoleMiddleware(["admin", "volunteer", "donor"]),
      asyncHandler(async (req, res) => {
        const body = req.body;

        const donarInfo = await userCollection.findOne({
          email: body.requesterEmail,
        });

        if (!donarInfo || donarInfo.status !== "active") {
          return res.status(403).json({
            message: "Donar is Blocked or Not Found",
            success: false,
          });
        }

        const finalData = {
          ...body,
          donationStatus: "pending",
        };

        const newDonationRequest =
          await donationRequestsCollection.insertOne(finalData);
        return res.status(201).json({
          message: "Donation Request Created Successflly",
          data: newDonationRequest,
          success: true,
        });
      }),
    );

    // Donation Request get by email | My donation request
    app.get(
      "/api/donation-request/:email",
      authMiddleware,
      checkRoleMiddleware(["admin", "volunteer", "donor"]),
      asyncHandler(async (req, res) => {
        const donorEmail = req.params.email;
        const { status, page = 1, limit = 3 } = req.query; 

        let query = { requesterEmail: donorEmail };
        if (status) {
          query.donationStatus = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const donationRequests = await donationRequestsCollection
          .find(query)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

    
        const totalRequests = await donationRequestsCollection.countDocuments(query);

        return res.status(200).json({
          message: "Donation Request Fetched Successflly",
          data: donationRequests,
          total: totalRequests,
          success: true,
        });
      }),
    );

    // single donation request
    app.get(
      "/api/donation-requests/:id",
      authMiddleware,
      checkRoleMiddleware(["admin", "volunteer", "donor"]),
      asyncHandler(async (req, res) => {
        const id = req.params.id;

        const donationInfo = await donationRequestsCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!donationInfo) {
          return res.status(404).json({
            message: "Donation Request not found.",
            success: false,
          });
        }

        return res.status(200).json({
          message: "Donation Request Fetched Successflly",
          data: donationInfo,
          success: true,
        });
      }),
    );

    // Upadate for donation request
    app.put(
      "/api/donation-requests/:id",
      authMiddleware,
      checkRoleMiddleware(["admin", "volunteer", "donor"]),
      asyncHandler(async (req, res) => {
        const id = req.params.id;

        const donationInfo = await donationRequestsCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!donationInfo) {
          return res.status(404).json({
            message: "Donation Request not found.",
            success: false,
          });
        }
        const updateDonationReq = await donationRequestsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: req.body,
          },
        );
        return res.status(200).json({
          message: "Donation Request updated successfully.",
          success: true,
          modifiedCount: updateDonationReq.modifiedCount,
        });
      }),
    );

    // delete  donation request
    app.delete(
      "/api/donation-requests/:id",
      authMiddleware,
      checkRoleMiddleware(["admin", "volunteer", "donor"]),
      asyncHandler(async (req, res) => {
        const id = req.params.id;

        const donationInfo = await donationRequestsCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!donationInfo) {
          return res.status(404).json({
            message: "Donation Request not found.",
            success: false,
          });
        }
        await donationRequestsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        return res.status(200).json({
          message: "Donation Request deleted successfully.",
          success: true,
        });
      }),
    );

    // Pending -> Inprogress -> Done/Canceled
    app.patch(
      "/api/donation-requests/status/:id",
      authMiddleware,
      checkRoleMiddleware(["admin", "volunteer", "donor"]),
      asyncHandler(async (req, res) => {
        const id = req.params.id;
        const { donationStatus, donorName, donorEmail } = req.body;

        const donationInfo = await donationRequestsCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!donationInfo) {
          return res.status(404).json({
            message: "Donation Request not found.",
            success: false,
          });
        }

        let updateFields = { donationStatus: donationStatus };

        if (donationStatus === "inprogress") {
          updateFields.donorName = donorName;
          updateFields.donorEmail = donorEmail;
        }

        const updateDonationReqStatus =
          await donationRequestsCollection.updateOne(
            { _id: new ObjectId(id) },
            {
              $set: updateFields,
            },
          );
        return res.status(200).json({
          message: "Donation Request status updated successfully.",
          success: true,
          modifiedCount: updateDonationReqStatus.modifiedCount,
        });
      }),
    );



    //TASK- Eta comment korte hbe
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
