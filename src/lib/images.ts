export const resizeImage = (file: File, maxDimension: number): Promise<File> => {
  // GIFs skip resizing: canvas.toBlob() doesn't support re-encoding to
  // image/gif (browsers silently produce PNG bytes instead), and resizing
  // would also flatten any animation to a single frame.
  if (file.type === 'image/gif') {
    return Promise.resolve(file)
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const { width, height } = img
      const largestSide = Math.max(width, height)

      if (largestSide <= maxDimension) {
        resolve(file)
        return
      }

      const scale = maxDimension / largestSide
      const targetWidth = Math.round(width * scale)
      const targetHeight = Math.round(height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          resolve(new File([blob], file.name, { type: file.type }))
        },
        file.type,
        0.85
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo procesar la imagen.'))
    }

    img.src = objectUrl
  })
}
