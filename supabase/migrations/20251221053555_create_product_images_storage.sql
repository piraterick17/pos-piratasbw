/*
  # Create Product Images Storage Bucket

  1. New Storage Bucket
    - `product-images` bucket
      - Public access for reading
      - 5MB file size limit
      - Allowed: JPG, PNG, WebP, GIF
  
  2. Security Policies
    - Public SELECT (anyone can view product images)
    - Authenticated INSERT (only logged users can upload)
    - Authenticated UPDATE (only logged users can update)
    - Authenticated DELETE (only logged users can delete)
  
  3. Notes
    - Images will be organized by product ID: product-images/{product_id}/image-{n}-{timestamp}.{ext}
    - Public bucket required for displaying images in catalog
*/

-- Create the bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view product images (public read)
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Policy: Authenticated users can upload images
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Policy: Authenticated users can update images
CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

-- Policy: Authenticated users can delete images
CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');