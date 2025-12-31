import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB for verification documents
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/webp', 'application/pdf'];

/**
 * Save uploaded file to local storage
 * @param {File} file - The uploaded file
 * @param {string} category - Category folder (logo, favicon, hero, product)
 * @returns {Promise<string>} - Public URL of uploaded file
 */
export async function saveUploadedFile(file, category = 'general') {
  try {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Geçersiz dosya tipi. İzin verilenler: JPG, PNG, SVG, ICO, WEBP`);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Dosya boyutu çok büyük. Maksimum: 2MB`);
    }

    // Ensure upload directory exists
    const categoryDir = path.join(UPLOAD_DIR, category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    // Generate unique filename
    const ext = path.extname(file.name) || '.png';
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(categoryDir, filename);

    // Save file using async writeFile
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filepath, buffer);

    // Return public URL
    return `/uploads/${category}/${filename}`;
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

/**
 * Delete file from storage
 * @param {string} fileUrl - Public URL of file to delete
 */
export function deleteUploadedFile(fileUrl) {
  try {
    if (!fileUrl || !fileUrl.startsWith('/uploads/')) {
      return;
    }

    const filepath = path.join(process.cwd(), 'public', fileUrl);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

/**
 * Validate image file
 */
export function validateImageFile(file) {
  const errors = [];

  if (!file) {
    errors.push('Dosya seçilmedi');
    return errors;
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push('Geçersiz dosya tipi');
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push('Dosya boyutu 2MB\'dan büyük olamaz');
  }

  return errors;
}
