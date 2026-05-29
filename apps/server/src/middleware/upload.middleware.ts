import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Multer storage configuration.
 * Stores files temporarily in memory for Sharp processing.
 */
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|pdf|doc|docx)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"));
    }
  },
});

/**
 * Sharp WebP compression middleware.
 * Compresses uploaded images to WebP format before storing to disk.
 * Non-image files (PDFs, docs) are saved as-is.
 */
export async function compressAndSave(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file && !req.files) {
      next();
      return;
    }

    const files = req.file ? [req.file] : (req.files as Express.Multer.File[]) || [];
    const savedPaths: string[] = [];

    for (const file of files) {
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalname);
      const timestamp = Date.now();
      const baseName = path.basename(file.originalname, path.extname(file.originalname));

      if (isImage) {
        // Compress to WebP
        const outputName = `${baseName}_${timestamp}.webp`;
        const outputPath = path.join(UPLOAD_DIR, outputName);

        await sharp(file.buffer)
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(outputPath);

        savedPaths.push(`/uploads/${outputName}`);
      } else {
        // Save non-image files directly
        const outputName = `${baseName}_${timestamp}${path.extname(file.originalname)}`;
        const outputPath = path.join(UPLOAD_DIR, outputName);
        fs.writeFileSync(outputPath, file.buffer);
        savedPaths.push(`/uploads/${outputName}`);
      }
    }

    // Attach saved paths to the request for controller access
    (req as any).savedFilePaths = savedPaths;
    next();
  } catch (error) {
    next(error);
  }
}
