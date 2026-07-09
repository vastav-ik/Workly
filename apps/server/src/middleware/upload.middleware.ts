import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Ensure uploads directory exists (for local fallback)
const UPLOAD_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Initialize S3 Client conditionally
const s3Configured = !!(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET_NAME
);

let s3Client: S3Client | null = null;
if (s3Configured) {
  try {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    console.log("🌲 AWS S3 Client initialised successfully");
  } catch (err) {
    console.error("❌ Failed to initialise AWS S3 Client:", err);
  }
} else {
  console.log("⚠️ AWS S3 credentials not set. Falling back to local disk storage.");
}

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
      const baseName = path.basename(file.originalname, path.extname(file.originalname)).replace(/\s+/g, "_");
      
      let finalBuffer: Buffer;
      let outputName: string;
      let contentType: string;

      if (isImage) {
        outputName = `${baseName}_${timestamp}.webp`;
        contentType = "image/webp";
        // Compress to WebP
        finalBuffer = await sharp(file.buffer)
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
      } else {
        outputName = `${baseName}_${timestamp}${path.extname(file.originalname)}`;
        contentType = file.mimetype || "application/octet-stream";
        finalBuffer = file.buffer;
      }

      if (s3Client && process.env.AWS_S3_BUCKET_NAME) {
        // Upload to AWS S3
        const bucket = process.env.AWS_S3_BUCKET_NAME;
        const uploadParams = {
          Bucket: bucket,
          Key: outputName,
          Body: finalBuffer,
          ContentType: contentType,
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        const fileUrl = process.env.CDN_DISTRIBUTION_URL
          ? `${process.env.CDN_DISTRIBUTION_URL.replace(/\/$/, "")}/${outputName}`
          : `https://${bucket}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${outputName}`;

        savedPaths.push(fileUrl);
      } else {
        // Fallback to local storage
        const outputPath = path.join(UPLOAD_DIR, outputName);
        fs.writeFileSync(outputPath, finalBuffer);
        savedPaths.push(`/uploads/${outputName}`);
      }
    }

    // Attach saved paths to request for controller access
    (req as any).savedFilePaths = savedPaths;
    next();
  } catch (error) {
    next(error);
  }
}
