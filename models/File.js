const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("File", FileSchema);
