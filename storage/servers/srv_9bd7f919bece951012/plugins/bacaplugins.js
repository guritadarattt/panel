const fs = require('fs')
const path = require('path')

const handler = async (Gurita, m) =>{
  if (!m.isOwner) return Gurita.sendMessage(m.chat, {text: "hanya owner yang bisa menggunakan command ini"})
  const namaplugins = m.text.split(" ")[1]
  if (!namaplugins) return Gurita.sendMessage(m.chat, {text: "masukan nama plugin"})
  const pluginPath = path.join(__dirname, `${namaplugins}.js`)
  if (!fs.existsSync(pluginPath)) return Gurita.sendMessage(m.chat, {text: `plugin ${namaplugins} tidak ditemukan`})
  const baca = fs.readFileSync(pluginPath, 'utf-8')
  await Gurita.sendMessage(m.chat, {text: baca.toString()})
}
handler.cmd = ['bacaplugins']
handler.nama = "bacaplugins"
handler.on = "owner"
handler.help = "bacaplugins <namaplugin>"
module.exports = handler