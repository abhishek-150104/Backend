import mongoose from "mongoose";

const commissionProofSchema = new mongoose.Schema({

  userId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  proof:{
    public_id:{
      type: String,
      required: true,
    },url: {
      type: String,
      required: true,  
    },
  },
  uploadAt:{
    type: Date,
    default: Date.now,
  },
  status:{
    type: String,
    enum: ["Pending", "Approved", "Rejected", "Settled"],
  },
  amount:{
    type: Number,
  },
  comment: String,
});

export const PaymentProof = mongoose.model("PaymentProof", commissionProofSchema);