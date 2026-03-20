// Handle all interest and match-related socket events
const Interest = require("../models/Interest");
const User = require("../models/User");

const registerInterestEvents = (io, socket) => {
  // Send interest to a user
  socket.on("interest:send", async (data) => {
    try {
      const { senderId, receiverId, message = "" } = data;

      // Check if interest already exists
      const existingInterest = await Interest.findOne({
        sender: senderId,
        receiver: receiverId,
      });

      if (existingInterest) {
        socket.emit("interest:error", {
          message: "Interest already sent to this user",
        });
        return;
      }

      // Create new interest
      const interest = new Interest({
        sender: senderId,
        receiver: receiverId,
        status: "pending",
        message,
        sentAt: new Date(),
      });

      await interest.save();

      // Notify receiver
      io.to(`user:${receiverId}`).emit("interest:received", {
        _id: interest._id,
        senderId,
        senderName: (await User.findById(senderId))?.firstName,
        message,
        receivedAt: interest.sentAt,
      });

      // Emit confirmation to sender
      socket.emit("interest:sent:confirmation", {
        interestId: interest._id,
        receiverId,
        status: "pending",
      });
    } catch (error) {
      socket.emit("error", {
        type: "interest:send",
        message: error.message,
      });
    }
  });

  // Accept interest (create match)
  socket.on("interest:accept", async (data) => {
    try {
      const { interestId, receiverId, senderId } = data;

      // Update interest to accepted
      const interest = await Interest.findByIdAndUpdate(interestId, {
        status: "accepted",
        acceptedAt: new Date(),
      });

      // Notify sender that interest was accepted
      io.to(`user:${senderId}`).emit("match:created", {
        matchedWith: receiverId,
        matchedWithName: (await User.findById(receiverId))?.firstName,
        interestId,
      });

      // Confirm to receiver
      socket.emit("interest:accepted:confirmation", {
        interestId,
        status: "accepted",
      });
    } catch (error) {
      socket.emit("error", {
        type: "interest:accept",
        message: error.message,
      });
    }
  });

  // Reject interest
  socket.on("interest:reject", async (data) => {
    try {
      const { interestId, receiverId, senderId } = data;

      await Interest.findByIdAndUpdate(interestId, {
        status: "rejected",
        rejectedAt: new Date(),
      });

      // Notify sender of rejection
      io.to(`user:${senderId}`).emit("interest:rejected", {
        interestId,
        rejectedBy: receiverId,
        status: "rejected",
      });

      // Confirm to receiver
      socket.emit("interest:rejected:confirmation", {
        interestId,
        status: "rejected",
      });
    } catch (error) {
      socket.emit("error", {
        type: "interest:reject",
        message: error.message,
      });
    }
  });

  // Get pending interests
  socket.on("interest:getPending", async (data) => {
    try {
      const { userId } = data;

      const interests = await Interest.find({
        receiver: userId,
        status: "pending",
      })
        .populate("sender", "firstName lastName profilePhoto age gender")
        .sort({ sentAt: -1 });

      socket.emit("interest:pendingList", {
        interests,
        total: interests.length,
      });
    } catch (error) {
      socket.emit("error", {
        type: "interest:getPending",
        message: error.message,
      });
    }
  });

  // Get sent interests
  socket.on("interest:getSent", async (data) => {
    try {
      const { userId } = data;

      const interests = await Interest.find({
        sender: userId,
      })
        .populate("receiver", "firstName lastName profilePhoto age gender")
        .sort({ sentAt: -1 });

      socket.emit("interest:sentList", {
        interests,
        total: interests.length,
      });
    } catch (error) {
      socket.emit("error", {
        type: "interest:getSent",
        message: error.message,
      });
    }
  });

  // Cancel sent interest
  socket.on("interest:cancel", async (data) => {
    try {
      const { interestId } = data;

      await Interest.findByIdAndDelete(interestId);

      socket.emit("interest:cancelled", {
        interestId,
        status: "cancelled",
      });
    } catch (error) {
      socket.emit("error", {
        type: "interest:cancel",
        message: error.message,
      });
    }
  });
};

module.exports = registerInterestEvents;
