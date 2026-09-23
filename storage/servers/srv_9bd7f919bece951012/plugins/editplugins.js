const fs = require('fs')
const path = require('path')

const handler = async (Gurita, m) =>{
  if (!m.isOwner) return Gurita.sendMessage(m.chat, {text: "hanya owner yang bisa menggunakan command ini"})
  const pluginName = m.text.split(" ")[1]
  if (!pluginName) return Gurita.sendMessage(m.chat, {text: "masukan nama plugin"})
  if (!m.quoted) return Gurita.sendMessage(m.chat, {text: "reply text plugin"})
  const pluginPath = path.join(__dirname, `${pluginName}.js`)
  if (!fs.existsSync(pluginPath)) return Gurita.sendMessage(m.chat, {text: `plugin ${pluginName} tidak ditemukan`})
  fs.writeFileSync(pluginPath, m.quoted.text)
  await Gurita.sendMessage(m.chat, {text: `plugin ${pluginName} berhasil diedit`})
}
handler.cmd = ['editplugin']
handler.nama = "editplugin"
handler.on = "owner"
handler.help = "editplugin <nama plugin> & <reply text>"
module.exports = handler