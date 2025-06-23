import mongoose from "mongoose";



export const connection = async () => {
  try {
    const conn = await mongoose.connect(`${process.env.MONGO_URI}/AUCTION_APPLICATION`);
    console.log(`\n MongoDB connected !!${conn.connection.host}`)
  } catch (error) {
    console.log("MONGO_URI =", process.env.MONGO_URI);

    console.log(`MongoDB connection error: ${error}`);
  }
};
