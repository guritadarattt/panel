const fs = require('fs')
const path = require('path')

const handler = async (Gurita, m) =>{
  if (!m.isOwner) return Gurita.sendMessage(m.chat, {text: "hanya owner yang bisa menggunakan command ini"})
  const pluginName = m.text.split(" ")[1]
  if (!pluginName) return Gurita.sendMessage(m.chat, {text: "masukan nama plugin"})
  const pluginPath = path.join(__dirname, `${pluginName}.js`)
  if (!fs.existsSync(pluginPath)) return Gurita.sendMessage(m.chat, {text: `plugin ${pluginName} tidak ditemukan`})
  fs.unlinkSync(pluginPath)
  await Gurita.sendMessage(m.chat, {text: `plugin ${pluginName} berhasil dihapus`})
}
handler.cmd = ['delplugin']
handler.nama = "delplugin"
handler.on = "owner"
handler.help = "delplugin <nama plugin>"
module.exports = handler