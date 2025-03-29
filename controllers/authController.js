const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const File = require("../models/File");
const path = require("path");
const fs = require("fs");


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub, email, name, picture } = ticket.getPayload();
    let user = await User.findOne({ googleId: sub });

    if (!user) {
      user = await User.create({ googleId: sub, email, name, avatar: picture });
    } else {
      // Update avatar in case user changed their Google profile picture
      user.avatar = picture;
      await user.save();
    }

    console.log("User after login:", user); // ✅ Debugging

    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.cookie("authToken", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
    });

    res.json({ message: "Login successful", user });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ error: "Invalid Google token" });
  }
};


const logout = (req, res) => {
  res.clearCookie("authToken", { 
    path: "/", 
    httpOnly: true, 
    sameSite: "None", 
    secure: true 
  });
  
  res.status(200).json({ message: "Logged out successfully" });
};


const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-__v");
    if (!user) return res.status(404).json({ error: "User not found" });

    console.log("Fetched User:", user); // ✅ Debugging

    res.json({
      name: user.name,
      email: user.email,
      avatar: user.avatar || "https://via.placeholder.com/150", // ✅ Ensure a default avatar
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

const uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Save image path (relative URL)
    user.avatar = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({ message: "Avatar updated successfully", avatar: user.avatar });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};


// for uasers personal filess

const getUserFiles = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Fetching files for userId: ${userId}`); // Debugging

    // Validate user existence and populate files
    const user = await User.findById(userId).populate("files");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User files retrieved successfully",
      files: user.files,
    });
  } catch (error) {
    console.error("Error fetching user files:", error);
    return res.status(500).json({ message: "Server error while retrieving files" });
  }
};

const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    // Find file in the database
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Delete file from server storage
    const filePath = path.join(__dirname, "..", "uploads", file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove file record from the database
    await File.findByIdAndDelete(fileId);

    return res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    return res.status(500).json({ message: "Server error while deleting file" });
  }
};

const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log(`Received download request for fileId: ${fileId}`);

    const file = await File.findById(fileId);
    if (!file) {
      console.log("❌ File not found in database.");
      return res.status(404).json({ message: "❌ File not found in database." });
    }

    const filePath = path.resolve("uploads", file.filename);
    console.log(`Resolved file path: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.log("❌ File not found on server.");
      return res.status(404).json({ message: "❌ File not found on server." });
    }

    console.log("✅ File found, starting download...");
    res.setHeader("Content-Disposition", `attachment; filename=${file.filename}`);
    res.setHeader("Content-Type", "application/octet-stream");

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ message: "❌ Server error while downloading file." });
  }
};


module.exports = { googleLogin, logout, getUser, uploadAvatar,getUserFiles,deleteFile,downloadFile };

