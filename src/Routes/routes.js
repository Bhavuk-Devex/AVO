const express = require("express");
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
const authenticate = require("../Authentication/auth");
const router = express.Router();

// User Apis
router.post("/SignUp", SignUp);
router.post("/resend-otp", ResendOTP);
router.post("/verify-otp", VerifyOTP);
router.post("/forgot-password", ForgotPassword);
router.post("/verify-forgot-password-otp", VerifyForgotPasswordOTP);
router.post("/reset-password", ResetPassword);
router.post("/signin", SignIn);

// Register business
router.post("/register-business", authenticate, RegisterOrUpdateBusiness);
router.get("/employee-list", authenticate, GetEmployeesByBusiness);
router.post("/add-employee", authenticate, AddEmployee);
router.put("/update-employee", authenticate, UpdateEmployee);
router.delete("/delete-employees", authenticate, DeleteEmployee);

module.exports = router;
