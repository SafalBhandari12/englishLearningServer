import multer from "multer";
import { extname } from "path";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Allow both WAV and WebM files
    const allowedMimes = [
      "audio/wav",
      "audio/x-wav",
      "audio/wave",
      "audio/webm",
      "video/webm", // Some browsers send webm audio as video/webm
    ];

    const allowedExtensions = [".wav", ".webm"];
    const fileExtension = extname(file.originalname).toLowerCase();

    if (
      !allowedMimes.includes(file.mimetype) ||
      !allowedExtensions.includes(fileExtension)
    ) {
      return cb(new Error("Only .wav and .webm files are allowed"));
    }

    cb(null, true);
  },
});
