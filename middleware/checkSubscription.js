module.exports = (feature) => {
  return (req, res, next) => {
    const user = req.user;

    if (user.subscriptionStatus !== "active") {
      return res.status(403).json({
        message: "Please upgrade your plan",
      });
    }

    if (user.subscriptionFeatures[feature] <= 0) {
      return res.status(403).json({
        message: `${feature} limit exceeded`,
      });
    }

    next();
  };
};