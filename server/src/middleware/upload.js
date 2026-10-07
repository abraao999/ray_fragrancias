import multer from "multer";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Envie apenas imagens."));
      return;
    }

    cb(null, true);
  }
});

export function fileToDataUrl(file) {
  if (!file) {
    return "";
  }

  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

export async function uploadProductImage(file) {
  if (!file) {
    return "";
  }

  if (!hasR2Config()) {
    return fileToDataUrl(file);
  }

  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  const folder = process.env.CLOUDFLARE_R2_FOLDER || "produtos";
  const publicUrl = getR2PublicUrl();
  const objectKey = `${folder}/${Date.now()}-${safeFileName(file.originalname || "produto.jpg")}`;
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    }
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: "public, max-age=31536000, immutable"
    })
  );

  return `${publicUrl.replace(/\/$/, "")}/${objectKey}`;
}

function hasR2Config() {
  return Boolean(
    process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
      process.env.CLOUDFLARE_R2_BUCKET &&
      process.env.CLOUDFLARE_R2_PUBLIC_URL
  );
}

function getR2PublicUrl() {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_DEV_URL;

  if (!publicUrl) {
    throw new Error("CLOUDFLARE_R2_PUBLIC_URL não foi configurada.");
  }

  if (publicUrl.includes("r2.cloudflarestorage.com")) {
    throw new Error("CLOUDFLARE_R2_PUBLIC_URL deve ser a URL pública do bucket, como https://pub-xxxx.r2.dev, não o endpoint privado r2.cloudflarestorage.com.");
  }

  return publicUrl;
}

function safeFileName(fileName) {
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
  const baseName = fileName.replace(/\.[^/.]+$/, "");

  return `${baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "produto"}.${extension}`;
}
