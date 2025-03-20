const express = require("express");
const multer = require("multer");
const {
  SignUp,
  ResendOTP,
  VerifyOTP,
  ForgotPassword,
  VerifyForgotPasswordOTP,
  ResetPassword,
  SignIn,
} = require("../users/users");
const {
  AddEmployee,
  DeleteEmployee,
  UpdateEmployee,
  RegisterOrUpdateBusiness,
  GetEmployeesByBusiness,
} = require("../business/business");
const { authenticate, isBusinessAdmin } = require("../Authentication/auth");
const {
  createOrUpdateOffer,
  deleteOffer,
  publishUnpublishOffer,
  publishedOfferList,
  businessOfferList,
} = require("../offers/offers");
const uploadImageCloudinary = require("../Cloundinary/imageUpload");
const router = express.Router();

const storage = multer.diskStorage({});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 10,
  },
});

// User Apis
router.post("/SignUp", SignUp);
router.post("/resend-otp", ResendOTP);
router.post("/verify-otp", VerifyOTP);
router.post("/forgot-password", ForgotPassword);
router.post("/verify-forgot-password-otp", VerifyForgotPasswordOTP);
router.post("/reset-password", ResetPassword);
router.post("/signin", SignIn);

// Register business and manage employee
router.post("/register-business", authenticate, RegisterOrUpdateBusiness);
router.get("/employee-list", authenticate, GetEmployeesByBusiness);
router.post("/add-employee", authenticate, AddEmployee);
router.put("/update-employee", authenticate, UpdateEmployee);
router.delete("/delete-employees", authenticate, DeleteEmployee);

// Offers
router.post(
  "/create-offer",
  authenticate,
  isBusinessAdmin,
  createOrUpdateOffer
);
router.delete("/delete-offer", authenticate, isBusinessAdmin, deleteOffer);
router.post(
  "/publish-offer",
  authenticate,
  isBusinessAdmin,
  publishUnpublishOffer
);
router.get("/publish-offer-list", authenticate, publishedOfferList);
router.get(
  "/business-offer-list",
  authenticate,
  isBusinessAdmin,
  businessOfferList
);

//image upload
router.post("/upload-image", upload.single("image"), uploadImageCloudinary);

module.exports = router;
