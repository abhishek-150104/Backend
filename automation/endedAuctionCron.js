import cron from "node-cron";
import { Auction } from "../models/auctionSchema.js";
import { User } from "../models/userSchema.js";
import { calculateCommission } from "../controllers/commissionController.js";
import { Bid } from "../models/bidSchema.js";
import { sendEmail } from "../utils/sendEmail.js";

export const endedAuctionCron = () => {
  cron.schedule("*/1 * * * *", async () => {
    const now = new Date();
    console.log("🔁 Cron for ended auction running...");

    const allPendingAuctions = await Auction.find({ commissionCalculated: false });

    const endedAuctions = allPendingAuctions.filter(auction => {
      const endTimeDate = new Date(auction.endTime);
      return endTimeDate < now;
    });

    console.log(`Ended Auctions Found: ${endedAuctions.length}`);

    for (const auction of endedAuctions) {
      try {
        const highestBidder = await Bid.findOne({
          auctionItem: auction._id,
          amount: auction.currentBid,
        });

        if (highestBidder) {
          const commissionAmount = await calculateCommission(auction._id);
          auction.highestBidder = highestBidder.bidder.id;
          auction.commissionCalculated = true;
          await auction.save();

          const bidder = await User.findById(highestBidder.bidder.id);
          const auctioneer = await User.findById(auction.createdBy);

          await User.findByIdAndUpdate(
            bidder._id,
            {
              $inc: {
                moneySpent: highestBidder.amount,
                auctionsWon: 1,
              },
            },
            { new: true }
          );

          await User.findByIdAndUpdate(
            auctioneer._id,
            {
              $inc: {
                unpaidCommission: commissionAmount,
              },
            },
            { new: true }
          );

          const subject = `Congratulations! You won the auction for ${auction.title}`;
          const message = `Dear ${bidder.userName}, 

Congratulations! You have won the auction for **${auction.title}**.

Before proceeding for payment, contact your auctioneer via email: ${auctioneer.email}

Please complete your payment using one of the following methods:

1. **Bank Transfer**:  
  - Account Name: ${auctioneer.paymentMethods.bankTransfer.bankAccountName}  
  - Account Number: ${auctioneer.paymentMethods.bankTransfer.bankAccountNumber}  
  - Bank: ${auctioneer.paymentMethods.bankTransfer.bankName}

2. **Razor Pay**:  
  - You can send payment via Razor Pay: ${auctioneer.paymentMethods.razorPay.razorNumber}

3. **PayPal**:  
  - Send payment to: ${auctioneer.paymentMethods.paypal.paypalEmail}

4. **Cash on Delivery (COD)**:  
  - If you prefer COD, you must pay **20%** of the total amount upfront before delivery.  
  - To pay the 20% upfront, use any of the above methods.  
  - The remaining 80% will be paid upon delivery.

If you want to see the condition of your auction item, send your email request to: ${auctioneer.email}

🕒 **Please ensure your payment is completed within 3 days.**  
Once we confirm the payment, the item will be shipped to you.

Thank you for participating!

Best regards,  
**Auction Team**`;

          console.log(`📧 Sending email to highest bidder: ${bidder.email}`);
          await sendEmail({ email: bidder.email, subject, message });
          console.log("✅ Email sent successfully.");
        } else {
          // No bidders – still mark commission as calculated to avoid repeat processing
          auction.commissionCalculated = true;
          await auction.save();
          console.log(`ℹ️ No bids placed for auction "${auction.title}"`);
        }

      } catch (error) {
        console.error("❌ Error in ended auction cron:", error);
      }
    }
  });
};
