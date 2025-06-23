export const catchAsyncErrors = (func) => (req, res, next) => {
  Promise.resolve(func(req, res, next))
  .catch((error) => {
    console.error("Error in catchAsyncErrors:", error);
    next(error);
  });
}