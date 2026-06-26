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

let userCollection, donationRequestsCollection;

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

        const totalRequests =
          await donationRequestsCollection.countDocuments(query);

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

        const {
          recipientName,
          recipientDistrict,
          recipientUpazila,
          hospitalName,
          bloodGroup,
          date,
          time,
          details,
        } = req.body;

        // allowed field to update
        const allowedUpdates = {
          recipientName,
          recipientDistrict,
          recipientUpazila,
          hospitalName,
          bloodGroup,
          date,
          time,
          details,
        };
        // un updated field delete
        Object.keys(allowedUpdates).forEach(
          (key) =>
            allowedUpdates[key] === undefined && delete allowedUpdates[key],
        );

        const updateDonationReq = await donationRequestsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: allowedUpdates,
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

    // donation request pending || Publlic
    app.get(
      "/api/donation-requests/public-pending",
      asyncHandler(async (req, res) => {
        const donationRequests = await donationRequestsCollection
          .find({ donationStatus: "pending" })
          .toArray();

        return res.status(200).json({
          message: "Donation Request Fetched Successflly",
          data: donationRequests,
          success: true,
        });
      }),
    );

    // Search for donation requests || Public
    app.get(
      "/api/donation-requests/search",
      asyncHandler(async (req, res) => {
        const { bloodGroup, district, upazila } = req.query;
        let query = {};

        if (bloodGroup) {
          query.bloodGroup = bloodGroup;
        }
        if (district) {
          query.recipientDistrict = district;
        }
        if (upazila) {
          query.recipientUpazila = upazila;
        }

        const donationRequests = await donationRequestsCollection
          .find(query)
          .toArray();

        return res.status(200).json({
          message: "Donation Request Fetched Successflly",
          data: donationRequests,
          success: true,
        });
      }),
    );

    // all user info for admin
    app.get(
      "/api/users",
      authMiddleware,
      checkRoleMiddleware(["admin"]),
      asyncHandler(async (req, res) => {
        const { status, page = 1, limit = 3 } = req.query;

        let query = {};

        if (status) {
          query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const users = await userCollection
          .find(query)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const totalUsers = await userCollection.countDocuments(query);

        return res.status(200).json({
          message: "Users Fetched Successflly",
          data: users,
          total: totalUsers,
          success: true,
        });
      }),
    );
    // user status control by admin
    app.patch(
      "/api/users/status/:id",
      authMiddleware,
      checkRoleMiddleware(["admin"]),
      asyncHandler(async (req, res) => {
        const id = req.params.id;
        const { status } = req.body;

        const userInfo = await userCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!userInfo) {
          return res.status(404).json({
            message: "User not found.",
            success: false,
          });
        }

        let updateFields = { status: status };

        const updateUserStatus = await userCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: updateFields,
          },
        );
        return res.status(200).json({
          message: "User status updated successfully.",
          success: true,
          modifiedCount: updateUserStatus.modifiedCount,
        });
      }),
    );

    // user role change by admin | Donar, Volunteer, Admin
    app.patch(
      "/api/users/role/:id",
      authMiddleware,
      checkRoleMiddleware(["admin"]),
      asyncHandler(async (req, res) => {
        const id = req.params.id;
        const { role } = req.body;

        const userInfo = await userCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!userInfo) {
          return res.status(404).json({
            message: "User not found.",
            success: false,
          });
        }

        let updateFields = { role: role };

        const updateUserRole = await userCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: updateFields,
          },
        );
        return res.status(200).json({
          message: "User role updated successfully.",
          success: true,
          modifiedCount: updateUserRole.modifiedCount,
        });
      }),
    );

    // get all donation request for admin
    app.get(
      "/api/all-donation-requests",
      authMiddleware,
      checkRoleMiddleware(["admin", "volunteer"]),
      asyncHandler(async (req, res) => {
        const { limit = 3, page = 1, status } = req.query;

        let query = {};
        if (status) {
          query.donationStatus = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const donationRequests = await donationRequestsCollection
          .find(query)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const totalRequests =
          await donationRequestsCollection.countDocuments(query);

        return res.status(200).json({
          message: "Donation Request Fetched Successflly",
          data: donationRequests,
          total: totalRequests,
          success: true,
        });
      }),
    );

    // 06 user data for home page
    app.get(
      "/api/featured-donor",
      asyncHandler(async (req, res) => {
        const feauturedDonars = await userCollection
          .find({ role: "donor" })
          .sort({ createdAt: -1 })
          .limit(6)
          .toArray();

        return res.status(200).json({
          message: "Featured Donor Fetched Successfully",
          data: feauturedDonars,
          success: true,
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
