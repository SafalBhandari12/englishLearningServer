import multer from "multer";
import { extname } from "path";


export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["audio/wav", "audio/x-wav", "audio/wave"];
    if (
      !allowed.includes(file.mimetype) ||
      extname(file.originalname).toLowerCase() !== ".wav"
    ) {
      return cb(new Error("Only .wav files allowed"));
    }
    cb(null, true);
  },
});
