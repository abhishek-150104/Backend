import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Auction } from "../models/auctionSchema.js";
import { Bid } from "../models/bidSchema.js";
import { User } from "../models/userSchema.js";

export const placeBid = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const auctionItem = await Auction.findById(id);

  if (!auctionItem) {
    return next(new ErrorHandler("Auction item not found.", 404));
  }

  const { amount } = req.body;

  if (!amount) {
    return next(new ErrorHandler("Please place your bid.", 400));
  }

  if (amount <= auctionItem.currentBid) {
    return next(new ErrorHandler("Bid amount must be higher than the current bid.", 400));
  }

  if (amount < auctionItem.startingBid) {
    return next(new ErrorHandler("Bid amount must be higher than the starting bid.", 400));
  }

  try {
    const bidderDetail = await User.findById(req.user._id);

    const existingBid = await Bid.findOne({
      "bidder.id": req.user._id,
      auctionItem: auctionItem._id,
    });

    const existingBidInAuction = auctionItem.bids.find(
      (bid) => bid.userId.toString() === req.user._id.toString()
    );

    if (existingBid && existingBidInAuction) {
      // Update bid in Bid collection
      existingBid.amount = amount;
      await existingBid.save();

      // Update embedded bid in Auction document
      auctionItem.bids = auctionItem.bids.map((bid) =>
        bid.userId.toString() === req.user._id.toString()
          ? { ...bid.toObject(), amount }
          : bid
      );
    } else {
      // Create new bid
      await Bid.create({
        amount,
        bidder: {
          id: req.user._id,
          userName: bidderDetail.userName,
          profileImage: bidderDetail.profileImage?.url,
        },
        auctionItem: auctionItem._id,
      });

      // Add to embedded array in auction
      auctionItem.bids.push({
        userId: req.user._id,
        userName: bidderDetail.userName,
        profileImage: bidderDetail.profileImage?.url,
        amount,
      });
    }

    // Update currentBid and highestBidder
    auctionItem.currentBid = amount;
    auctionItem.highestBidder = req.user._id;

    await auctionItem.save();

    res.status(201).json({
      success: true,
      message: "Bid placed successfully.",
      currentBid: auctionItem.currentBid,
    });
  } catch (error) {
    return next(new ErrorHandler("Error placing bid. Please try again.", 500));
  }
});
