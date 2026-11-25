#!/bin/bash

S3_BUCKET="supercloud-userdata"
# S3_FOLDER_PREFIX="user-seeds/banners-for-user-seeds"
# S3_FOLDER_PREFIX="royalty-free-song-seeds/artwork-for-song-seeds"
S3_FOLDER_PREFIX="royalty-free-song-seeds/artwork-for-song-seeds-2"

TMP_DIR="./tmp/resized_images"

# temp directory to hold images
mkdir -p "$TMP_DIR"

# list all image filenames from the S3 bucket
aws s3 ls "s3://$S3_BUCKET/$S3_FOLDER_PREFIX/" | \
  grep -E '\.jpg$|\.jpeg$|\.png$|\.gif$|\.bmp$' | \
  awk '{print $4}' | \
# for each file...
while read -r FILENAME; do 
  # copy the image from the bucket to the temp folder
  aws s3 cp "s3://$S3_BUCKET/$S3_FOLDER_PREFIX/$FILENAME" "$TMP_DIR/"

  FILE_SIZE=$(stat -c %s "$TMP_DIR/$FILENAME")
  
  # if the file is >200KB (200 * 1024 bytes)...
  if [ $FILE_SIZE -gt 204800 ]; then
    # use imagemagick convert to resize/compress the image
    convert "$TMP_DIR/$FILENAME" -resize 50% -quality 80 "$TMP_DIR/resized_$FILENAME"

    # put the resized/compressed image back into the S3 bucket, overwriting the original
    aws s3 cp "$TMP_DIR/resized_$FILENAME" "s3://$S3_BUCKET/$S3_FOLDER_PREFIX/$FILENAME"
    
    # remove the local file for cleanup
    rm "$TMP_DIR/resized_$FILENAME"
  fi
  
  # remove the local file for cleanup
  rm "$TMP_DIR/$FILENAME"
done

rm -rf "$TMP_DIR"

echo "image resizing complete"
