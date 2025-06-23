import express from "express";
import cors from "cors";
import  {config}  from "dotenv";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import { connection } from "./database/connection.js";
import { errorMiddleware } from "./middlewares/error.js";
import userRouter from "./router/userRoutes.js";
import auctionItemRouter from "./router/auctionItemRoutes.js";
import bidRouter from "./router/bidsRoutes.js";
import commissionRouter from "./router/commisionRouter.js";
import superAdminRouter from "./router/superAdminroutes.js";
import { endedAuctionCron } from "./automation/endedAuctionCron.js"
import { verifyCommissionCron } from "./automation/verifyCommissionCron.js";
// Backend: index.js or app.js
// import cors from 'cors';


const app = express();
config({
  path:"./config/config.env"
})


app.use(cors({
  origin: ['http://localhost:5173','https://primebid19.netlify.app'],
  methods: ["POST", "GET", "PUT", "DELETE"],
  credentials: true,
}));


app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true,  }));
app.use(express.static("public"));

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: "/tmp/"
}));
app.get('/',(req,res) => {
  res.send({
    activeStatus:true,
    error:false,
  })
})

app.use("/api/v1/user", userRouter);
app.use("/api/v1/auctionItem", auctionItemRouter);
app.use("/api/v1/bid", bidRouter);
app.use("/api/v1/commission", commissionRouter);
app.use("/api/v1/superadmin", superAdminRouter);


endedAuctionCron(); // Start the cron job for ended auctions
verifyCommissionCron(); // Start the cron job for verifying commissions


// Connect DB
connection();

app.use(errorMiddleware)


export default app;
