import mongoose from "mongoose";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Auction } from "../models/auctionSchema.js"


export const checkAuctionEndTime = catchAsyncErrors(async (req, res, next) => {
  // console.log(req.params)
  const {id} = req.params;
  if(!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid ID Format" });
  }
  const auction = await Auction.findById(id);

  if(!auction){
    return next(new ErrorHandler("Auction not found", 404));
  }
  const now = new Date();
  if(new Date(auction.startTime)>now) {
    return next(new ErrorHandler("Auction has not started yet", 400));
  }
  if(new Date(auction.endTime)<now) {
    return next(new ErrorHandler("Auction has already ended", 400));
  }

  next();
  
});