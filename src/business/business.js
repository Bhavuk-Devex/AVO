const db = require("../DB/db");
const util = require("util");
const bcrypt = require("bcryptjs");
const { isValidEmail } = require("../Utils/Common");
const jwt = require("jsonwebtoken");

const query = util.promisify(db.query).bind(db);

// Register Business API
const RegisterOrUpdateBusiness = async (req, res) => {
  const { business_id, business_name, business_address, logo } = req.body;
  const user_id = req.user.id; // Logged-in user ID
  const user_role = req.user.role; // Logged-in user role

  if (!business_name) {
    return res.json({
      status: 400,
      data: { message: "Business name is required." },
    });
  }

  try {
    if (business_id) {
      // ✅ Update Business (If business_id is provided)
      if (user_role !== "business_admin") {
        return res.json({
          status: 403,
          data: {
            message:
              "Unauthorized: Only business admins can update business details.",
          },
        });
      }

      // ✅ Check if business exists and belongs to the user
      const [business] = await query(
        "SELECT * FROM businesses WHERE id = ? AND owner_id = ?",
        [business_id, user_id]
      );
      if (!business) {
        return res.json({
          status: 404,
          data: { message: "Business not found or unauthorized." },
        });
      }

      // ✅ Update business details
      await query(
        "UPDATE businesses SET name = ?, address = ?, logo = ? WHERE id = ?",
        [
          business_name || business.name,
          business_address || business.address,
          logo || business.logo,
          business_id,
        ]
      );

      return res.json({
        status: 200,
        data: { message: "Business updated successfully." },
      });
    } else {
      // ✅ Register New Business (If business_id is not provided)

      // Check if user already owns a business
      const [user] = await query("SELECT * FROM users WHERE id = ?", [user_id]);
      if (!user) {
        return res.json({
          status: 404,
          data: { message: "User not found." },
        });
      }
      if (user.role === "business_admin") {
        return res.json({
          status: 400,
          data: { message: "User is already a business admin." },
        });
      }

      // ✅ Insert new business
      const businessResult = await query(
        "INSERT INTO businesses (name, owner_id, address, logo) VALUES (?, ?, ?, ?)",
        [business_name, user_id, business_address, logo || null]
      );
      const newBusinessId = businessResult.insertId;

      // ✅ Generate new auth token with updated role
      const newAuthToken = jwt.sign(
        { id: user_id, role: "business_admin", business_id: newBusinessId },
        "SECRET_KEY",
        { expiresIn: "7d" }
      );

      // ✅ Update user role and business_id
      await query(
        "UPDATE users SET role = 'business_admin', business_id = ?, auth_token = ? WHERE id = ?",
        [newBusinessId, newAuthToken, user_id]
      );

      return res.json({
        status: 200,
        data: {
          message: "Business registered successfully.",
          business_id: newBusinessId,
          auth_token: newAuthToken,
        },
      });
    }
  } catch (error) {
    console.error("❌ Error:", error);
    return res.json({
      status: 500,
      data: { message: "Internal Server Error", error: error.message },
    });
  }
};

const AddEmployee = async (req, res) => {
  try {
    const { name, email, password, number, address, profile_photo } = req.body;
    const admin_id = req.user.id; // Extract business admin ID from token

    // ✅ Validate required fields
    if (!name || !email || !password) {
      return res.json({
        status: 400,
        data: { message: "Name, email, and password are required." },
      });
    }

    // ✅ Check if the user is a business admin
    const adminRows = await query("SELECT * FROM users WHERE id = ?", [
      admin_id,
    ]);
    if (!adminRows.length || adminRows[0].role !== "business_admin") {
      return res.json({
        status: 403,
        data: {
          message: "Unauthorized: Only business admins can add employees.",
        },
      });
    }

    // ✅ Check if business exists
    if (!adminRows[0].business_id) {
      return res.json({
        status: 400,
        data: {
          message: "Business not found. Please register a business first.",
        },
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.json({
        status: 400,
        data: { message: "Invalid email format." },
      });
    }

    // ✅ Check if email already exists
    const existingUser = await query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    if (existingUser.length > 0) {
      return res.json({
        status: 409,
        data: { message: "Email already in use." },
      });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Set default values for optional fields
    const employeeData = {
      name,
      email,
      password: hashedPassword,
      number: number || null,
      address: address || "Not Provided",
      profile_photo: profile_photo || null,
      role: "employee",
      business_id: adminRows[0].business_id,
      is_verified: true, // Employees are auto-verified
    };

    // ✅ SQL query for insertion
    const insertQuery = `
      INSERT INTO users (name, email, password, number, address, profile_photo, role, business_id, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      employeeData.name,
      employeeData.email,
      employeeData.password,
      employeeData.number,
      employeeData.address,
      employeeData.profile_photo,
      employeeData.role,
      employeeData.business_id,
      employeeData.is_verified,
    ];

    // ✅ Execute query
    const result = await query(insertQuery, values);
    console.log("✅ Employee added:", result.insertId);

    return res.json({
      status: 200,
      data: {
        message: "Employee added successfully",
        employee_id: result.insertId,
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

const UpdateEmployee = async (req, res) => {
  try {
    const { employee_id, name, number, address, profile_photo, password } =
      req.body;
    const user_id = req.user.id; // Logged-in user ID
    const user_role = req.user.role; // Logged-in user role

    // ✅ Check if employee_id is provided
    if (!employee_id) {
      return res.json({
        status: 400,
        data: { message: "Employee ID is required." },
      });
    }

    // ✅ Fetch employee details
    const employeeRows = await query("SELECT * FROM users WHERE id = ?", [
      employee_id,
    ]);
    if (!employeeRows.length) {
      return res.json({
        status: 404,
        data: { message: "Employee not found." },
      });
    }
    const employee = employeeRows[0];

    // ✅ Authorization checks
    if (user_role === "business_admin") {
      // Business admin can update any employee in their business
      const adminRows = await query("SELECT * FROM users WHERE id = ?", [
        user_id,
      ]);
      if (
        !adminRows.length ||
        adminRows[0].business_id !== employee.business_id
      ) {
        return res.json({
          status: 403,
          data: {
            message:
              "Unauthorized: You can only update employees in your business.",
          },
        });
      }
    } else if (user_role === "employee") {
      // Employees can only update their own details and NOT password
      if (parseInt(user_id) !== parseInt(employee_id)) {
        return res.json({
          status: 403,
          data: {
            message:
              "Unauthorized: Employees can only update their own profile.",
          },
        });
      }
      if (password) {
        return res.json({
          status: 403,
          data: { message: "Employees cannot update their password." },
        });
      }
    } else {
      return res.json({
        status: 403,
        data: { message: "Unauthorized: Access denied." },
      });
    }

    // ✅ Prevent email updates
    if (req.body.email && req.body.email !== employee.email) {
      return res.json({
        status: 400,
        data: { message: "Email cannot be updated." },
      });
    }

    // ✅ Hash password if provided (only admins can update it)
    let hashedPassword = employee.password;
    if (password && user_role === "business_admin") {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // ✅ Update query
    const updateQuery = `
      UPDATE users SET 
        name = ?, 
        number = ?, 
        address = ?, 
        profile_photo = ?, 
        password = ?, 
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const values = [
      name || employee.name,
      number || employee.number,
      address || employee.address,
      profile_photo || employee.profile_photo,
      hashedPassword, // Only updates if admin provided a new password
      employee_id,
    ];
    await query(updateQuery, values);

    return res.json({
      status: 200,
      data: { message: "Employee updated successfully." },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.json({
      status: 500,
      data: { message: "Internal Server Error", error: error.message },
    });
  }
};

const DeleteEmployee = async (req, res) => {
  try {
    const { employee_id } = req.query;
    const admin_id = req.user.id;

    // ✅ Check if the user is a business admin
    const adminRows = await query("SELECT * FROM users WHERE id = ?", [
      admin_id,
    ]);
    if (!adminRows.length || adminRows[0].role !== "business_admin") {
      return res.json({
        status: 403,
        data: {
          message: "Unauthorized: Only business admins can delete employees.",
        },
      });
    }

    // ✅ Check if business exists
    if (!adminRows[0].business_id) {
      return res.json({
        status: 400,
        data: {
          message: "Business not found. Please register a business first.",
        },
      });
    }

    // ✅ Check if employee exists and belongs to the admin's business
    const employeeRows = await query(
      "SELECT * FROM users WHERE id = ? AND business_id = ? AND role = 'employee'",
      [employee_id, adminRows[0].business_id]
    );
    if (!employeeRows.length) {
      return res.json({
        status: 404,
        data: {
          message: "Employee not found or does not belong to your business.",
        },
      });
    }

    // ✅ Delete query
    await query("DELETE FROM users WHERE id = ? AND business_id = ?", [
      employee_id,
      adminRows[0].business_id,
    ]);

    return res.json({
      status: 200,
      data: { message: "Employee deleted successfully." },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.json({
      status: 500,
      data: { message: "Internal Server Error", error: error.message },
    });
  }
};

const GetEmployeesByBusiness = async (req, res) => {
  try {
    const { business_id } = req.query;
    const user_id = req.user.id;
    const user_role = req.user.role;

    // ✅ Ensure business_id is provided
    if (!business_id) {
      return res.json({
        status: 400,
        data: { message: "Business ID is required." },
      });
    }

    // ✅ If user is a business admin, check if they own this business
    if (user_role === "business_admin") {
      const adminRows = await query(
        "SELECT * FROM users WHERE id = ? AND business_id = ?",
        [user_id, business_id]
      );

      if (!adminRows.length) {
        return res.json({
          status: 403,
          data: {
            message: "Unauthorized: You don't have access to this business.",
          },
        });
      }
    }

    // ✅ Fetch employees for the given business_id
    const employees = await query(
      "SELECT id, name, email, number, address, profile_photo FROM users WHERE business_id = ? AND role = 'employee'",
      [business_id]
    );

    return res.json({
      status: 200,
      data: { employees },
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
  AddEmployee,
  DeleteEmployee,
  UpdateEmployee,
  RegisterOrUpdateBusiness,
  GetEmployeesByBusiness,
};
