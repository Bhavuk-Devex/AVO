const db = require("../DB/db");
const util = require("util");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { isValidEmail, sendOTP, generateOTP } = require("../Utils/Common");

const query = util.promisify(db.query).bind(db);

const SECRET_KEY = "Hello_World";

const SignUp = async (req, res) => {
  try {
    const { name, email, password, number, address, profile_photo } = req.body;

    // Check required fields
    if (!name || !email || !password) {
      return res.json({
        status: 400,
        data: { message: "Name, email, and password are required." },
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.json({
        status: 400,
        data: { message: "Invalid email format." },
      });
    }

    // Check if email already exists
    const existingUser = await query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    if (existingUser.length > 0) {
      return res.json({
        status: 409,
        data: { message: "Email already exists." },
      });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    await sendOTP(email, otp);

    // Set default values for optional fields
    const userData = {
      name,
      email,
      password: hashedPassword,
      number: number || null,
      address: address || "Not Provided",
      role: "user",
      otp: otp,
      is_verified: false,
      auth_token: null,
      refresh_token: null,
      profile_photo: null,
    };

    // SQL query for insertion
    const insertQuery = `
      INSERT INTO users (name, number, address, email, password, role, otp, is_verified, auth_token, refresh_token, profile_photo)  
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      userData.name,
      userData.number,
      userData.address,
      userData.email,
      userData.password,
      userData.role,
      userData.otp,
      userData.is_verified,
      userData.auth_token,
      userData.refresh_token,
      userData.profile_photo,
    ];

    console.log(values);

    // Execute query
    const result = await query(insertQuery, values);

    console.log("✅ User added:", result.insertId);

    return res.json({
      status: 200,
      data: { message: "User added successfully", userId: result.insertId },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.json({
      status: 500,
      data: { message: "Internal Server Error", error: error.message },
    });
  }
};

const ResendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.json({ status: 400, data: { message: "Email is required." } });
    }

    const user = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (user.length === 0) {
      return res.json({ status: 404, data: { message: "User not found." } });
    }

    const otp = generateOTP();
    await query("UPDATE users SET otp = ? WHERE email = ?", [otp, email]);
    await sendOTP(email, otp);

    return res.json({
      status: 200,
      data: { message: "OTP resent successfully." },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.json({
      status: 500,
      data: { message: "Internal Server Error", error: error.message },
    });
  }
};

const VerifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.json({
        status: 400,
        data: { message: "Email and OTP are required." },
      });
    }

    const user = await query("SELECT id, otp FROM users WHERE email = ?", [
      email,
    ]);
    if (user.length === 0) {
      return res.json({ status: 404, data: { message: "User not found." } });
    }

    if (user[0].otp !== otp) {
      return res.json({ status: 400, data: { message: "Invalid OTP." } });
    }

    await query(
      "UPDATE users SET is_verified = ?, otp = NULL WHERE email = ?",
      [true, email]
    );

    return res.json({
      status: 200,
      data: { message: "OTP verified successfully. Account activated." },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.json({
      status: 500,
      data: { message: "Internal Server Error", error: error.message },
    });
  }
};

const ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.json({ status: 400, data: { message: "Email is required." } });
    }

    const user = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (user.length === 0) {
      return res.json({ status: 404, data: { message: "User not found." } });
    }

    const otp = generateOTP();
    await query("UPDATE users SET otp = ? WHERE email = ?", [otp, email]);
    await sendOTP(email, otp);

    return res.json({
      status: 200,
      data: { message: "OTP sent successfully." },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.json({
      status: 500,
      data: { message: "Internal Server Error", error: error.message },
    });
  }
};

const VerifyForgotPasswordOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.json({
        status: 400,
        data: { message: "Email and OTP are required." },
      });
    }

    const user = await query("SELECT id, otp FROM users WHERE email = ?", [
      email,
    ]);
    if (user.length === 0) {
      return res.json({ status: 404, data: { message: "User not found." } });
    }

    if (user[0].otp !== otp) {
      return res.json({ status: 400, data: { message: "Invalid OTP." } });
    }

    await query("UPDATE users SET otp = NULL WHERE email = ?", [email]);

    return res.json({
      status: 200,
      data: { message: "OTP verified. You can reset your password." },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.json({
      status: 500,
      data: { message: "Internal Server Error", error: error.message },
    });
  }
};

const ResetPassword = async (req, res) => {
  try {
    const { email, new_password } = req.body;
    if (!email || !new_password) {
      return res.json({
        status: 400,
        data: { message: "Email and new password are required." },
      });
    }

    const user = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (user.length === 0) {
      return res.json({ status: 404, data: { message: "User not found." } });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await query("UPDATE users SET password = ? WHERE email = ?", [
      hashedPassword,
      email,
    ]);

    return res.json({
      status: 200,
      data: { message: "Password reset successfully." },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.json({
      status: 500,
      data: { message: "Internal Server Error", error: error.message },
    });
  }
};

const SignIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.json({
        status: 400,
        data: { message: "Email and password are required." },
      });
    }

    // Check if user exists
    const user = await query("SELECT * FROM users WHERE email = ?", [email]);
    if (user.length === 0) {
      return res.json({ status: 404, data: { message: "User not found." } });
    }

    // Check if user is verified
    if (!user[0].is_verified) {
      return res.json({
        status: 403,
        data: { message: "Account not verified. Please verify your email." },
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user[0].password);
    if (!isMatch) {
      return res.json({
        status: 401,
        data: { message: "Invalid credentials." },
      });
    }

    // Generate JWT token
    const authToken = jwt.sign(
      { id: user[0].id, role: user[0].role },
      "SECRET_KEY",
      {
        expiresIn: "1d",
      }
    );

    // Store the token in the database
    await query("UPDATE users SET auth_token = ? WHERE id = ?", [
      authToken,
      user[0].id,
    ]);

    return res.json({
      status: 200,
      data: {
        message: "Sign in successful.",
        auth_token: authToken,
        user: {
          id: user[0].id,
          name: user[0].name,
          email: user[0].email,
          number: user[0].number,
          address: user[0].address,
          profile_photo: user[0].profile_photo,
          role: user[0].role,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.json({
      status: 500,
      data: { message: "Internal Server Error", error: error.message },
    });
  }
};

module.exports = {
  SignUp,
  ResendOTP,
  VerifyOTP,
  ForgotPassword,
  VerifyForgotPasswordOTP,
  ResetPassword,
  SignIn,
};
