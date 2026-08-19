import sharp from 'sharp'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

export const LOGO_PATH = join(process.cwd(), 'public', 'images', 'blkuzz-logo.png')

// Resize + compress based on upload purpose
export const PROFILES = {
  avatar: { width: 400,  height: 400,  fit: 'cover',  quality: 88 },
  cover:  { width: 2400, height: null, fit: 'inside', quality: 92 },
  post:   { width: 1800, height: null, fit: 'inside', quality: 90 },
}

export async function transcodeToH264(inputBuffer, inputExt) {
  const tmpIn  = join(tmpdir(), `${randomUUID()}.${inputExt}`)
  const tmpOut = join(tmpdir(), `${randomUUID()}.mp4`)

  await writeFile(tmpIn, inputBuffer)

  await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-i', tmpIn,
      '-i', LOGO_PATH,
      '-filter_complex', '[1:v]scale=180:-1,format=rgba,colorchannelmixer=aa=0.8[wm];[0:v][wm]overlay=W-w-20:H-h-20:format=auto',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      '-y', tmpOut,
    ])
    let stderr = ''
    ff.stderr.on('data', d => { stderr += d })
    ff.on('error', reject)
    ff.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`)))
  })

  const outBuffer = await readFile(tmpOut)
  await Promise.all([unlink(tmpIn), unlink(tmpOut)]).catch(() => {})
  return outBuffer
}

export async function processImage(buffer, type) {
  const profile = PROFILES[type] ?? PROFILES.post
  const pipeline = sharp(buffer)
    .rotate()
    .resize(profile.width, profile.height ?? null, {
      fit: profile.fit,
      withoutEnlargement: true,
      ...(profile.fit === 'cover' ? { position: 'centre' } : {}),
    })
    .webp({ quality: profile.quality })

  return pipeline.toBuffer()
}
