const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/UserModel");
const { validationResult } = require("express-validator");
const getUserById = asyncHandler(async (req, res) => {
  try {
    let userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    res.send([user]);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});
const getUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.find();
    res.send({
      length: user.length,
      user,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});
const loginUser = asyncHandler(async (req, res) => {
  let success = false;
  // If there are errors, return Bad request and the errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      (success = true),
        res.json({
          success,
          _id: user.id,
          name: user.name,
          email: user.email,
          phoneNo: user.phoneNo,
          address: user.address,
          authtoken: generateToken(user._id),
        });
    } else {
      res.status(400);
      throw new Error("Invalid credentials");
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please add all fields");
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    // Check whether the user with this email exists already
    let user = await User.findOne({ email: req.body.email });
    if (user) {
      return res
        .status(400)
        .json({ error: "Sorry a user with this email already exists" });
    }
    const salt = await bcrypt.genSalt(10);
    const secPass = await bcrypt.hash(req.body.password, salt);

    // Create a new user
    user = await User.create({
      name: req.body.name,
      password: secPass,
      email: req.body.email,
      phoneNo: req.body.phoneNo,
      address: req.body.address,
    });

    let authtoken = generateToken(user._id);

    // res.json(user)
    res.json({ authtoken });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
  //res.status(200).json({ message: "register user" });
});
const updateUser = asyncHandler(async (req, res) => {
  try {
    let user = await User.findById(req.params.id);
    // Check for user
    if (!user) {
      res.status(401);
      throw new Error("User not found");
    }

    // Make sure the logged in user matches the goal user
    if (user._id.toString() !== req.user.id) {
      res.status(401);
      throw new Error("User not authorized");
    }

    const { name, email, password, phoneNo, address } = req.body;

    // check if email or username is already taken
    const checkname = await User.findOne({ name });
    const checkEmail = await User.findOne({ email });

    if (checkname && checkEmail) {
      return res.status(400).json({ msg: "name and Email are already taken" });
    }
    if (checkname) {
      return res.status(400).json({ msg: "name is already taken" });
    }
    if (checkEmail) {
      return res.status(400).json({ msg: "Email is already taken" });
    }

    let userField = {};
    if (name) {
      userField.name = name;
    }
    if (email) {
      userField.email = email;
    }
    if (address) {
      userField.address = address;
    }
    if (phoneNo) {
      userField.phoneNo = phoneNo;
    }
    if (password) {
      // hash password and save
      const salt = await bcrypt.genSalt(10);
      userField.password = await bcrypt.hash(password, salt);
    }

    user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: userField },
      { new: true }
    );

    // create new jsonwebtoken
    const payload = {
      user: {
        id: user._id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {
        expiresIn: "90d",
      },

      (err, token) => {
        if (err) throw err;
        res.json({ msg: "Successfully updated!", token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
const deleteUser = asyncHandler(async (req, res) => {
  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User does not exist!!" });
    }

    if (user._id.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    user = await User.findByIdAndDelete(req.params.id);

    res.json({ msg: "Account successfully deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "90d",
  });
};
module.exports = {
  getUser,
  getUserById,
  loginUser,
  updateUser,
  registerUser,
  deleteUser,
};
