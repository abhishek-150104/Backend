import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { PaymentProof } from "../models/commissionProofSchema.js";
import {User} from "../models/userSchema.js";
import { Auction } from "../models/auctionSchema.js";
import {v2 as cloudinary} from "cloudinary";
import mongoose from "mongoose";

export const calculateCommission = async(auctionId)=>{
  
  if(!mongoose.Types.ObjectId.isValid(auctionId)) {
    throw new ErrorHandler("Invalid Auction ID", 400);
  }
  const auction = await Auction.findById(auctionId);
  const commissionRate = 0.05;
  const commission = auction.currentBid * commissionRate;
  const user = await User.findById(auction.createdBy);
  
  return commission;
}


export const proofOfCommission = catchAsyncErrors(async (req, res, next) => {

  if(!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorHandler("Payment Proof Screenshot Required.", 400));
  }
  // console.log("hlo1");
  const {proof} = req.files;
  const  {amount, comment} = req.body;
  const user = await User.findById(req.user._id);
  // console.log("hlo2");
  if(!amount || !comment) {
    return next(new ErrorHandler("Amount and comment are required.", 400));
  }
  // console.log("hlo3");
  if(user.unpaidCommission === 0) {
    return res.status(200).json({
      success:true,
      message:"No unpaid commission available.",
    });
  }
  // console.log("hlo4");
  if(user.unpaidCommission < amount) {
    return next(new ErrorHandler(`Amount exceeds unpaid commission. Please enter an amount uo to ${user.unpaidCommission}`, 403));
  }
  // console.log("hlo5");
  const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedFormats.includes(proof.mimetype)) {
    return next(new ErrorHandler("Image Format not supported.", 400));
  }
  // console.log("hlo6");
  const cloudinaryResponse = await cloudinary.uploader.upload(
    proof.tempFilePath,
    {
      folder: "Auction_Payment_Proofs",
    }
  );
  
  if (!cloudinaryResponse || cloudinaryResponse.error) {
    console.error(
      "Cloudinary error:",
      cloudinaryResponse.error || "Unknown cloudinary error."
    );
    return next(
      new ErrorHandler("Failed to upload Payment.", 500)
    );
  }
  // console.log("hlo7");
  const commissionProof = await PaymentProof.create({
    userId: req.user._id,
    proof: {
      public_id: cloudinaryResponse.public_id,
      url: cloudinaryResponse.secure_url,
    },
    status: "Pending",
    amount,
    comment,
    // status: "Pending",
  });
  // console.log("hlo8");
  res.status(201).json({
    success: true,
    message: "Payment Proof Uploaded Successfully. We will review it  and respond to you with in 48 hours.",
    commissionProof,
  });


});