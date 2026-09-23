const fs = require('fs')
const path = require('path')

const handler = async (Gurita, m) =>{
  const pluginsDir = path.join(__dirname, '..', 'plugins')
  const plugins = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'))
  const pluginList = plugins.map(plugin => plugin.replace('.js', '')).join('\n')
  Gurita.sendMessage(m.chat, {text: `Daftar Plugin:\n\n${pluginList}`})
}

handler.cmd = ['listplugins']
handler.nama = "listplugins"
handler.on = "owner"
handler.help = "listplugins"
module.exports = handler