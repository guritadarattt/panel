const fs = require('fs')
const path = require('path')

// Array global tempat kumpulan plugin
const handlers = []

function loadHandlers(dir = path.join(__dirname, 'plugins')) {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      // 🔁 Rekursif untuk folder dalam folder
      loadHandlers(filePath)
    } else if (file.endsWith('.js')) {
      try {
        const handler = require(filePath)

        // ✅ Validasi: minimal punya salah satu dari berikut
        const isValid = typeof handler === 'function' || typeof handler.auto === 'function'
        if (isValid) {
          handlers.push(handler)
          console.log(`✅ Loaded: ${filePath}`)
        } else {
          console.log(`⚠️  Skipped (bukan plugin valid): ${filePath}`)
        }

      } catch (e) {
        console.error(`❌ Error loading plugin: ${filePath}`, e)
      }
    }
  }

  return handlers
}

module.exports = { loadHandlers }
