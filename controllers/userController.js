import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js"
import {User} from "../models/userSchema.js";
import {v2 as cloudinary} from "cloudinary";
import { generateToken } from "../utils/jwtToken.js";

export const register = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorHandler("Profile Image Required.", 400));
  }

  const { profileImage } = req.files;

  const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedFormats.includes(profileImage.mimetype)) {
    return next(new ErrorHandler("File format not supported.", 400));
  }
  //  console.log(req.files);
  // console.log(req.body);

  const {
    userName,
    email,
    password,
    phone,
    address,
    role,
    bankAccountNumber,
    bankAccountName,
    bankName,
    razorNumber,
    paypalEmail,
  } = req.body || {};

  if (!userName || !email || !phone || !password || !address || !role) {
    return next(new ErrorHandler("Please fill full form.", 400));
  }
  // console.log("hlo1")
  if (role === "Auctioneer") {
    if (!bankAccountName || !bankAccountNumber || !bankName) {
      return next(
        new ErrorHandler("Please provide your full bank details.", 400)
      );
    }
    // console.log("hlo2")
    if (!razorNumber) {
      return next(
        new ErrorHandler("Please provide your Razor PAy Number account number.", 400)
      );
    }

    // console.log("hlo3")
    if (!paypalEmail) {
      return next(new ErrorHandler("Please provide your paypal email.", 400));
    }
  }


  // const allUsers = await User.find({});
  // console.log("All users in DB:", allUsers);

  const isRegistered = await User.findOne({ email });
 
  if (isRegistered) {
    return next(new ErrorHandler("User already registered.", 400));
  }
  // console.log("hlo6")
  // console.log(isRegistered)
  const cloudinaryResponse = await cloudinary.uploader.upload(
    profileImage.tempFilePath,
    {
      folder: "AuctionImages",
    }
  );
  
  if (!cloudinaryResponse || cloudinaryResponse.error) {
    console.error(
      "Cloudinary error:",
      cloudinaryResponse.error || "Unknown cloudinary error."
    );
    return next(
      new ErrorHandler("Failed to upload profile image to cloudinary.", 500)
    );
  }
  // console.log("hlo7")
  const user = await User.create({
    userName,
    email,
    password,
    phone,
    address,
    role,
    profileImage: {
      public_id: cloudinaryResponse.public_id,
      url: cloudinaryResponse.secure_url,
    },
    paymentMethods: {
      bankTransfer: {
        bankAccountNumber,
        bankAccountName,
        bankName,
      },
      razorPay: {
        razorNumber,
      },
      paypal: {
        paypalEmail,
      },
    },
  });
  // console.log("hlo8")
  generateToken(user, "User Registered Successfully.",201, res);
});


export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;
  if(!email || !password) {
    return next(new ErrorHandler("Please enter email and password.", 400));
  }
  const user = await User.findOne({ email }).select("+password");
  if(!user){
    return next(new ErrorHandler("Invalid Credentials.", 400));
  }
  const isPasswordMatch = await user.comparePassword(password);
  if(!isPasswordMatch) {
    return next(new ErrorHandler("Invalid Credentials.", 400));
  }
  generateToken(user, "Login Successfully.", 200, res);
});


export const getProfile = catchAsyncErrors(async (req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});


export const logout = catchAsyncErrors(async (req, res, next) => {
  res.status(200).cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
    secure: true, 
    sameSite: "None",      
  }).json({
    success: true,
    message: "Logged out successfully.",
  });
});


export const fetchLeaderboard = catchAsyncErrors(async (req, res, next) => {
  const users = await User.find({moneySpent:{$gt: 0}});
  const leaderboard = users.sort((a, b) => b.moneySpent - a.moneySpent);
  res.status(200).json({
    success: true,
    leaderboard, // Return top money speneder 
  });
});

