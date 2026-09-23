const fs = require('fs')
const path = require('path')

const handler = async (Gurita, m) =>{
  if (!m.isOwner) return Gurita.sendMessage(m.chat, {text: "hanya owner yang bisa menggunakan command ini"})
  const namafile = m.text.split(" ")[1]
  const filePath = path.join(__dirname, '..', namafile)
  if (!fs.existsSync(filePath)) return Gurita.sendMessage(m.chat, {text: `file ${namafile} tidak ditemukan`})
  const baca = fs.readFileSync(filePath, 'utf-8')
  await Gurita.sendMessage(m.chat, {text: baca.toString()})
}

handler.cmd = ['bacafile']
handler.nama = "bacafile"
handler.on = "owner"
handler.help = "bacafile <namafile>"
module.exports = handler