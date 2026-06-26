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

const validBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const validStatuses = ["pending", "inprogress", "done", "canceled"];

async function run() {
  try {
    await client.connect();

    const db = client.db("roktoneer");

    // collections

    userCollection = db.collection("user");
    donationRequestsCollection = db.collection("donationRequests");

    // active donors  count

    app.get(
      "/api/active-donors-count",
      asyncHandler(async (req, res) => {
        const countActiveDonars = await userCollection.countDocuments({
          role: "donor",
          status: "active",
        });

        return res.status(200).json({
          success: true,
          message: "Featured donors fetched successfully",
          data: countActiveDonars,
        });
      }),
    );
    // public pending requests

    app.get(
      "/api/donation-requests/public-pending",
      asyncHandler(async (req, res) => {
        const { bloodGroup, district, upazila, search } = req.query;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const skip = (page - 1) * limit;

        let query = {
          donationStatus: "pending",
        };

        if (bloodGroup) {
          query.bloodGroup = bloodGroup;
        }

        if (district) {
          query.recipientDistrict = district;
        }

        if (upazila) {
          query.recipientUpazila = upazila;
        }

        if (search) {
          query.$or = [
            {
              recipientName: {
                $regex: search,
                $options: "i",
              },
            },
            {
              hospitalName: {
                $regex: search,
                $options: "i",
              },
            },
            {
              fullAddress: {
                $regex: search,
                $options: "i",
              },
            },
          ];
        }

        const [donationRequests, totalItems] = await Promise.all([
          donationRequestsCollection
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray(),

          donationRequestsCollection.countDocuments(query),
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return res.status(200).json({
          success: true,
          message: "Pending donation requests fetched successfully",
          data: donationRequests,
          currentPage: page,
          totalPages,
          totalItems,
        });
      }),
    );

    // find donar
    app.get(
      "/api/users/donors",
      asyncHandler(async (req, res) => {
        const { bloodGroup, district, upazila } = req.query;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;

        const skip = (page - 1) * limit;

        let query = {
          role: "donor",
          status: "active",
        };

        if (bloodGroup) {
          query.bloodGroup = bloodGroup;
        }

        if (district) {
          query.district = district;
        }

        if (upazila) {
          query.upazila = upazila;
        }

        const totalItems = await userCollection.countDocuments(query);

        const totalPages = Math.ceil(totalItems / limit);

        const donors = await userCollection
          .find(query)
          .skip(skip)
          .limit(limit)
          .project({
            password: 0,
          })
          .toArray();

        return res.status(200).json({
          success: true,
          message: "Donors fetched successfully",
          data: donors,
          totalPages,
          currentPage: page,
          totalItems,
        });
      }),
    );
    // all donation requests

    app.get(
      "/api/donation-requests/all",
      authMiddleware,

      asyncHandler(async (req, res) => {
        const { status, page = 1, limit = 3 } = req.query;

        let query = {};

        if (status) {
          query.donationStatus = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const donationRequests = await donationRequestsCollection
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await donationRequestsCollection.countDocuments(query);

        return res.status(200).json({
          success: true,
          message: "Donation requests fetched successfully",
          data: donationRequests,
          total,
        });
      }),
    );

    // update donation request

    app.patch(
      "/api/donation-requests/:id",
      authMiddleware,
      checkRoleMiddleware(["admin", "donor","volunteer"]),
      asyncHandler(async (req, res) => {
        const { id } = req.params;

        const donationInfo = await donationRequestsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!donationInfo) {
          return res.status(404).json({
            success: false,
            message: "Donation request not found",
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
          fullAddress,
        } = req.body;

        if (bloodGroup && !validBloodGroups.includes(bloodGroup)) {
          return res.status(400).json({
            success: false,
            message: "Invalid blood group",
          });
        }

        const allowedUpdates = {
          recipientName,
          recipientDistrict,
          recipientUpazila,
          hospitalName,
          bloodGroup,
          date,
          time,
          details,
          fullAddress,
        };

        Object.keys(allowedUpdates).forEach(
          (key) =>
            allowedUpdates[key] === undefined && delete allowedUpdates[key],
        );

        const result = await donationRequestsCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: allowedUpdates,
          },
        );

        return res.status(200).json({
          success: true,
          message: "Donation request updated successfully",
          modifiedCount: result.modifiedCount,
        });
      }),
    );


    // create donation request

    app.post(
      "/api/donation-request",
      authMiddleware,
      checkRoleMiddleware(["admin", "volunteer", "donor"]),
      asyncHandler(async (req, res) => {
        const body = req.body;

        const donorInfo = await userCollection.findOne({
          email: body.requesterEmail,
        });

        if (!donorInfo) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        if (donorInfo.status !== "active") {
          return res.status(403).json({
            success: false,
            message: "Blocked user can't create request",
          });
        }

        if (!validBloodGroups.includes(body.bloodGroup)) {
          return res.status(400).json({
            success: false,
            message: "Invalid blood group",
          });
        }

        const finalData = {
          ...body,
          donationStatus: "pending",
          createdAt: new Date(),
        };

        const result = await donationRequestsCollection.insertOne(finalData);

        return res.status(201).json({
          success: true,
          message: "Donation request created successfully",
          data: result,
        });
      }),
    );

    // my donation requests

    app.get(
      "/api/donation-request/:email",
      authMiddleware,
      checkRoleMiddleware(["admin", "donor", "volunteer"]),
      asyncHandler(async (req, res) => {
        const donorEmail = req.params.email;

        const { status, page = 1, limit = 3 } = req.query;

        if (req.user.email !== donorEmail) {
          return res.status(403).json({
            success: false,
            message: "Forbidden access",
          });
        }

        let query = {
          requesterEmail: donorEmail,
        };

        if (status && status !== "all") {
          query.donationStatus = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const donationRequests = await donationRequestsCollection
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await donationRequestsCollection.countDocuments(query);

        return res.status(200).json({
          success: true,
          message: "Donation requests fetched successfully",
          data: donationRequests,
          total,
        });
      }),
    );

    // single donation request

    app.get(
      "/api/donation-requests/:id",
      authMiddleware,
      checkRoleMiddleware(["admin", "volunteer", "donor"]),
      asyncHandler(async (req, res) => {
        const { id } = req.params;

        const donationInfo = await donationRequestsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!donationInfo) {
          return res.status(404).json({
            success: false,
            message: "Donation request not found",
          });
        }

        return res.status(200).json({
          success: true,
          message: "Donation request fetched successfully",
          data: donationInfo,
        });
      }),
    );

    
    // update donation request status

    app.patch(
      "/api/donation-requests/status/:id",
      authMiddleware,
      checkRoleMiddleware(["admin", "volunteer", "donor"]),
      asyncHandler(async (req, res) => {
        const { id } = req.params;

        const { donationStatus, donorName, donorEmail } = req.body;

        if (!validStatuses.includes(donationStatus)) {
          return res.status(400).json({
            success: false,
            message: "Invalid donation status",
          });
        }

        const donationInfo = await donationRequestsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!donationInfo) {
          return res.status(404).json({
            success: false,
            message: "Donation request not found",
          });
        }

        if (req.user.role === "donor") {
          if (req.user.email !== donationInfo.requesterEmail) {
            return res.status(403).json({
              success: false,
              message: "Forbidden access",
            });
          }
        }

        if (
          donationStatus === "inprogress" &&
          donationInfo.donationStatus !== "pending"
        ) {
          return res.status(400).json({
            success: false,
            message: "Only pending request can become inprogress",
          });
        }

        if (
          ["done", "canceled"].includes(donationStatus) &&
          donationInfo.donationStatus !== "inprogress"
        ) {
          return res.status(400).json({
            success: false,
            message: "Only inprogress request can become done or canceled",
          });
        }

        let updateFields = {
          donationStatus,
        };

        if (donationStatus === "inprogress") {
          updateFields.donorName = donorName;
          updateFields.donorEmail = donorEmail;
        }

        const result = await donationRequestsCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: updateFields,
          },
        );

        return res.status(200).json({
          success: true,
          message: "Donation request status updated successfully",
          modifiedCount: result.modifiedCount,
        });
      }),
    );

    // delete donation request

    app.delete(
      "/api/donation-requests/:id",
      authMiddleware,
      checkRoleMiddleware(["admin", "donor"]),
      asyncHandler(async (req, res) => {
        const { id } = req.params;

        const donationInfo = await donationRequestsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!donationInfo) {
          return res.status(404).json({
            success: false,
            message: "Donation request not found",
          });
        }

        if (
          req.user.email !== donationInfo.requesterEmail &&
          req.user.role !== "admin"
        ) {
          return res.status(403).json({
            success: false,
            message: "Forbidden access",
          });
        }

        await donationRequestsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        return res.status(200).json({
          success: true,
          message: "Donation request deleted successfully",
        });
      }),
    );

    // all users

    app.get(
      "/api/users",
      authMiddleware,
      checkRoleMiddleware(["admin"]),
      asyncHandler(async (req, res) => {
        const { status, page = 1, limit = 3 } = req.query;

        let query = {};

        if (status && status !== "all") {
          query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const users = await userCollection
          .find(query)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await userCollection.countDocuments(query);

        return res.status(200).json({
          success: true,
          message: "Users fetched successfully",
          data: users,
          total,
        });
      }),
    );

    // update user status

    app.patch(
      "/api/users/status/:id",
      authMiddleware,
      checkRoleMiddleware(["admin"]),
      asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;

        if (!["active", "blocked"].includes(status)) {
          return res.status(400).json({
            success: false,
            message: "Invalid status",
          });
        }

        const userInfo = await userCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!userInfo) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        const result = await userCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: { status },
          },
        );

        return res.status(200).json({
          success: true,
          message: "User status updated successfully",
          modifiedCount: result.modifiedCount,
        });
      }),
    );

    // update user role

    app.patch(
      "/api/users/role/:id",
      authMiddleware,
      checkRoleMiddleware(["admin"]),
      asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { role } = req.body;

        if (!["admin", "volunteer", "donor"].includes(role)) {
          return res.status(400).json({
            success: false,
            message: "Invalid role",
          });
        }

        const userInfo = await userCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!userInfo) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        const result = await userCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: { role },
          },
        );

        return res.status(200).json({
          success: true,
          message: "User role updated successfully",
          modifiedCount: result.modifiedCount,
        });
      }),
    );

    await client.db("admin").command({
      ping: 1,
    });

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
