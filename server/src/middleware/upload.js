import multer from "multer";

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
