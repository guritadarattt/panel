const handler = async (Gurita , m) =>{
if (false) return m.reply("sangean lu")
    const text = m.text.split(" ").slice(1).join(" ") || undefined
if (text == undefined) return m.reply('mana link nya?')
                let dld = await require("../lib/xnxx.js").xnxxdl(text)
                await Gurita.sendMessage(m.chat,{video :{url: dld.result.files.high}})
            }
handler.cmd = ["xnxxdl"]
handler.nama = "xnxxdl"
handler.on = "download"
handler.help = "xnxxdl <link>"
module.exports = handler
                