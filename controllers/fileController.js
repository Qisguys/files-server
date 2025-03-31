const { Readable } = require("stream");
const User = require("../models/User");
const File = require("../models/File");

const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);

    const uploadStream = global.gridfsBucket.openUploadStream(req.file.originalname);
    bufferStream.pipe(uploadStream);

    uploadStream.on("finish", () => {
      res.json({ message: "File uploaded successfully", fileId: uploadStream.id });
    });

    uploadStream.on("error", (err) => {
      console.error(err);
      res.status(500).json({ message: "Error uploading file" });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const getFiles = async (req, res) => {
  try {
    const files = await global.gridfsBucket.find().toArray();
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: "Error fetching files" });
  }
};

const getFile = async (req, res) => {
  try {
    const files = await global.gridfsBucket.find({ filename: req.params.filename }).toArray();
    if (!files.length) return res.status(404).json({ message: "File not found" });

    const file = files[0];
    res.set({
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    });

    const downloadStream = global.gridfsBucket.openDownloadStream(file._id);
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Error fetching file:", error);
    res.status(500).json({ message: "Error fetching file" });
  }
};

const deleteFile = async (req, res) => {
  try {
    const files = await global.gridfsBucket.find({ filename: req.params.filename }).toArray();
    if (!files.length) return res.status(404).json({ message: "File not found" });

    await global.gridfsBucket.delete(files[0]._id);
    res.json({ message: "File deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting file" });
  }
};


//files sending for user 
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const newFile = new File({
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer, // Store file as binary data
      user: req.user.id, // Assuming user is authenticated
    });

    await newFile.save();
    res.status(201).json({ message: "✅ File uploaded successfully!", file: newFile });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "❌ Server error while uploading file." });
  }
};

module.exports = { uploadFile, getFiles, getFile, deleteFile,uploadFiles };
