import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Commission } from "../models/commissionSchema.js";
import { User } from "../models/userSchema.js";
import mongoose from "mongoose";
import { Auction } from "../models/auctionSchema.js";
import { PaymentProof } from "../models/commissionProofSchema.js";

export const deleteAuctionItem = catchAsyncErrors(async (req, res, next) => {
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

export const getAllPaymentProofs = catchAsyncErrors(async (req, res, next) => {
  const paymentProofs = await PaymentProof.find();
  res.status(200).json({
    success:true,
    paymentProofs,
  });
});

export const getPaymentProofDetail = catchAsyncErrors(async (req, res, next) => {
  const { id }= req.params;
  const paymentProofDetail = await PaymentProof.findById(id);
  res.status(200).json({
    success:true,
    paymentProofDetail
  })
});


export const updateProofStatus = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { amount, status} = req.body || {};
  if(!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid ID Format", 400));
  }
  let proof = await PaymentProof.findById(id);
  if(!proof) {
    return next(new ErrorHandler("Payment Proof not found.", 404));
  }

  proof = await PaymentProof.findByIdAndUpdate(id, {
    status, amount,
  }, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  res.status(200).json({
    success: true,
    message: "Payment proof amount and status updated ",
    proof,
  });

})

export const deletePaymentProof = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const proof = await PaymentProof.findById(id)
  if(!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid ID Format", 400));
  }
  
  await proof.deleteOne();
  res.status(200).json({
    success: true,
    message: "Payment Proof deleted successfully.",
  });

});

export const fetchAllUsers = catchAsyncErrors(async (req, res, next) => {
  const user = await User.aggregate([
    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
          role: "$role"
        
        },
        count: { $sum: 1 },
      },
    },
    {
      $project:{
        month: "$_id.month",
        year: "$_id.year",
        role: "$_id.role",
        count: 1,
        _id: 0,
      }
    },
    {
      $sort: { year: 1, month: 1 }
    }
  ])
  const bidders = user.filter((user)=>user.role=== "Bidder");
  const auctioneers = user.filter((user)=>user.role=== "Auctioneer");

  const transformDataTOMonthlyArray = (data, totalMonths=12) =>{
    const result = Array(totalMonths).fill(0);

    data.forEach((item) => {
      result[item.month - 1 ] =item.count;
    });
    return result;
  }
  const  bidderArray = transformDataTOMonthlyArray(bidders);
  const auctioneerArray = transformDataTOMonthlyArray(auctioneers);
  res.status(200).json({
    success: true,
    bidderArray,
    auctioneerArray,
  })

});

export const monthlyRevenue = catchAsyncErrors(async (req, res, next) => {
  const payments = await Commission.aggregate([
    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        },
        totalAmount:{$sum: "$amount"},
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 }
    }
  ]);
  const transformDataTOMonthlyArray = (payments, totalMonths=12) =>{
    const result = Array(totalMonths).fill(0);

    payments.forEach((payment) => {
      result[payment._id.month - 1 ] =payment.totalAmount;
    });
    return result;
  }
  const totalMonthlyRevenue = transformDataTOMonthlyArray(payments);

  res.status(200).json({
    success:true,
    totalMonthlyRevenue,
  });
});