// Artwork is shown at most 348px tall, so a 640px short side stays sharp on retina screens.
// Same limits as scripts/resize-images-in-s3.sh uses for images already in the bucket.
const MAX_SHORT_SIDE = 640;
const JPEG_QUALITY = 0.75;

const loadImage = file => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => resolve({ img, url });
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('could not decode image'));
  };
  img.src = url;
});

const canvasToBlob = (canvas, type, quality) =>
  new Promise(resolve => canvas.toBlob(resolve, type, quality));

const hasTransparency = ctx => {
  const { data } = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
};

// Shrinks an image before upload so its shorter side is at most MAX_SHORT_SIDE px (aspect ratio kept).
// Browsers apply EXIF rotation when decoding, so sideways-stored phone photos come out upright.
// Returns a JPEG Blob (PNG if the image has transparent pixels), or the original file if it's
// already small enough, resizing wouldn't make it smaller, or the browser can't decode it.
export const resizeImage = async (file) => {
  let loaded;
  try {
    loaded = await loadImage(file);
    const { naturalWidth: w, naturalHeight: h } = loaded.img;
    const scale = Math.min(1, MAX_SHORT_SIDE / Math.min(w, h));
    if (scale === 1 && file.type === 'image/jpeg') return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(loaded.img, 0, 0, canvas.width, canvas.height);

    const type = file.type === 'image/png' && hasTransparency(ctx) ? 'image/png' : 'image/jpeg';
    const blob = await canvasToBlob(canvas, type, JPEG_QUALITY);
    return blob && blob.size < file.size ? blob : file;
  } catch (e) {
    console.error('image resize failed, uploading the original', e);
    return file;
  } finally {
    if (loaded) URL.revokeObjectURL(loaded.url);
  }
}

// PUTs a file to a presigned S3 URL. Returns true if the upload succeeded.
export const postToS3 = async (url, body) => {
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        // the file's real type (image/jpeg, audio/mpeg, ...) so S3 serves it correctly
        "Content-Type": body.type || "application/octet-stream"
      },
      body,
    });
    
    if (!res.ok) console.error('response from s3 fetch not ok, but did not error out');
    return res.ok;

  } catch(e) {
    console.log('PUT REQUEST TO S3 FAILED!');
    console.log(e);
    return false;
  }
}

export const getSongDuration = async (file) => {
  const audio = document.createElement('audio');

  if (file) {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    const songDuration = await new Promise((resolve, reject) => {
      reader.onload = function (e) {
        audio.src = e.target.result;

        audio.addEventListener('loadedmetadata', function () {
          // gets the duration of file in seconds with ms as float
          const duration = audio.duration;
          resolve(Math.floor(duration));
        });
      };
    });
    return songDuration;

  } else {
    return ("you didn't pass in an audio file!");
  }
}

export const secondsToMSS = (duration) => {
  let minutes = ~~(duration / 60);
  let seconds = duration - minutes * 60;

  if (seconds <= 9) {
    seconds = `0${seconds}`;
  }

  return `${minutes}:${seconds}`;
}
