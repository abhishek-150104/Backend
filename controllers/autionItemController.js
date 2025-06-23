import {Auction} from "../models/auctionSchema.js";
import mongoose from "mongoose";
import {User} from "../models/userSchema.js";
import {catchAsyncErrors} from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from"../middlewares/error.js";
import {v2 as cloudinary} from "cloudinary";
import { Bid } from "../models/bidSchema.js";

export const addNewAuctionItem = catchAsyncErrors(async (req, res,next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
      return next(new ErrorHandler("Auction Item Image Required.", 400));
    }
  
    const { image } = req.files;
  
    const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedFormats.includes(image.mimetype)) {
      return next(new ErrorHandler("File format not supported.", 400));
    }
    //  console.log(req.files);
    // console.log(req.body);
  
    const {
      title,
      description,
      startingBid,
      category,
      condition,
      startTime,
      endTime,
    } = req.body || {};
    
    if(!title || !description || !startingBid || !category || !condition || !startTime || !endTime) {
      return next(new ErrorHandler("All fields are required.", 400));
    }

    if(new Date(startTime) < Date.now()){
      return next(new ErrorHandler(" Auction Start time must be greater than Current time.", 400));
    }

    if(new Date(startTime) >= new Date(endTime)){
      return next(new ErrorHandler(" Auction Start time must be less than End time.", 400));
    }

    const alreadyOneAuctionActive = await Auction.findOne({
      createdBy: req.user._id,
      endTime: { $gte: new Date() },
    });

    if(alreadyOneAuctionActive) {
      return next(new ErrorHandler("You already have an active auction .", 400));
    }

    try{
      const cloudinaryResponse = await cloudinary.uploader.upload(
          image.tempFilePath,
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
            new ErrorHandler("Failed to upload auction image to cloudinary.", 500)
          );
        }
        const auctionItem = await Auction.create({
          title,
          description,
          startingBid,
          category,
          condition,
          startTime,
          endTime,
          image: {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
          },
          createdBy: req.user._id,
        });

        return res.status(201).json({
          success: true,
          message: `Auction item created successfully ans will be listed on auction page at ${startTime}.`,
          auctionItem
        });
    }catch (error) {
      return next(new ErrorHandler("Failed to create auction.", 500));
      
    }

});

export const getAllItems = catchAsyncErrors(async (req, res, next) => {
  let items = await Auction.find();
  res.status(200).json({
    success: true,
    items,
  });
});

export const getMyAuctionItems = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;
  const items = await Auction.find({ createdBy: userId });
  res.status(200).json(
    {
      success: true,
      items,
    });
});

export const getAuctionDetails = catchAsyncErrors(async (req, res, next) => {
  const {id} = req.params;
  if(!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid ID Format", 400));
  }
  const auctionItem = await Auction.findById(id)
  if(!auctionItem){
    return next(new ErrorHandler("Auction Item not found", 404));
  }
  const bidders = auctionItem.bids.sort((a,b)=> b.amount - a.amount);
  res.status(200).json({
    success: true,
    auctionItem,
    bidders,
  });
});

export const removeFromAuction = catchAsyncErrors(async (req, res, next) => {
  const {id} = req.params;
  if(!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid ID Format", 400));
  }
  const auctionItem = await Auction.findById(id)
  if(!auctionItem){
    return next(new ErrorHandler("Auction Item not found.", 404));
  }
  await auctionItem.deleteOne();
  // await cloudinary.uploader.destroy(auctionItem.image.public_id);
  res.status(200).json({
    success: true,
    message: "Auction Item removed successfully.",
  });
});

export const republishItem = catchAsyncErrors(async (req, res, next) => {
  const {id} = req.params;
  if(!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid ID Format", 400));
  }
  let auctionItem = await Auction.findById(id)
  if(!auctionItem){
    return next(new ErrorHandler("Auction Item not found.", 404));
  }
  if(!req.body.startTime || !req.body.endTime) {
    return next(new ErrorHandler("Start and end time for republish is mandatory", 400))};
  if(new Date(auctionItem.endTime) > Date.now()) {
    return next(new ErrorHandler("Auction Item is still active cannot be republished.", 400));
  }
  const data = {
    startTime: new Date(req.body.startTime),
    endTime: new Date(req.body.endTime),
  }
  if(data.startTime < Date.now()) {
    return next(new ErrorHandler("Auction Start time must be greater than Current time.", 400));
  }
  if(data.startTime >= data.endTime){
    return next(new ErrorHandler("Auction Start time must be less than End Time.",400));
  }

  if(auctionItem.highestBidder){
    const highestBidder = await User.findById(auctionItem.highestBidder);
    highestBidder.moneySpent -= auctionItem.currentBid; 
    highestBidder.auctionsWon -= 1;
    await highestBidder.save();
  }


auctionItem = await Auction.findByIdAndUpdate(
  id,
  {
    $set: {
      startTime: new Date(req.body.startTime),
      endTime: new Date(req.body.endTime),
      bids: [],
      commissionCalculated: false,
      currentBid: 0,
      highestBidder: null
    }
  },
  {
    new: true,
    runValidators: true
  }
);

  await Bid.deleteMany({auctionItem:auctionItem._id})
  const createdBy = await User.findByIdAndUpdate(req.user._id,
    {unpaidCommission: 0},
    {
      new: true,
      runValidators: false,
      useFindAndModify: false,
    }
  )
  res.status(200).json({
    success: true,
    message: `Auction republished and will be active on ${data.startTime}.`,
    auctionItem,
    createdBy,
  });

});