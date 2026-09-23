const handler = async (Gurita, m) => {
let key = m.text.split(" ")[1]
let plugins = pitur.find(v => v.nama == key)

if (!key) return m.reply('masukkan nama plugin')
if (!plugins) return m.reply('plugin tidak ditemukan')

let teks = `*${plugins.on.toUpperCase()} MENU*\n\n`

m.reply(plugins.help)
}

handler.cmd = ['help']
handler.nama = "help"
handler.on = "tools"
handler.help = "help <menu>"
module.exports = handler