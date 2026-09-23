
const handler = async (Gurita,m) =>{
    if (m.isGroup) return m.reply("tidak bisa digunakan di grup")
    const cmd2 = m.text.split(" ")[1]
if (!cmd2) return m.reply(`${m.cmd} start [nomor]\n${m.cmd} stop`)

    switch(cmd2){
        case "start":{
            const cek1 = Object.keys(dbconn).includes(m.sender)
            const cek2 = Object.values(dbconn).includes(m.sender)
            if (cek1 || cek2) return m.reply("anda sedang di dalam room")
            const nomor = m.text.split(cmd2 + " ")[1]
            let prrkek = nomor.replace(/[^0-9]/g, '')+`@s.whatsapp.net`
            const on = await Gurita.onWhatsApp(prrkek)
            
        if (on.length == 0) return m.reply(`Enter a valid and registered number on WhatsApp!!!`)
            global.dbconn[m.sender] = prrkek
        Gurita.sendMessage(m.chat,{text:`anda sekarang terhubung dengan @${prrkek.split("@")[0]}`,mentions : [prrkek]})
        Gurita.sendMessage(prrkek,{text:`seseorang ingin terhubug dengan anda.`})
        }
        break
        case "stop":{
            const cek1 = Object.keys(dbconn).includes(m.sender)
            const cek2 = Object.values(dbconn).includes(m.sender)
            if (cek1){
                const penerima = global.dbconn[m.sender]
                delete global.dbconn[m.sender]
                Gurita.sendMessage(m.chat,{text:`anda sudah tidak terhubung dengan @${penerima.split("@")[0]}`,mentions : [penerima]})
                Gurita.sendMessage(penerima,{text:`chat telah diakhiri oleh klien`})
            }if (cek2){
                let penerima
                for (let gg of Object.keys(dbconn) ){
                    if (global.dbconn[gg] == m.sender ){
                        penerima = gg
                    }
                }
                 Gurita.sendMessage(m.chat,{text:`anda sudah tidak terhubung dengan klien`})
                Gurita.sendMessage(penerima,{text:`chat telah diakhiri oleh klien`})
            }else{
                m.reply("anda sedang tidak di dalam confess")
            }

        }
        
    }

}
handler.cmd = ["confess"]
handler.nama = "confess"
handler.on = "basic"
handler.help = "confess start [nomor]\nconfess stop"
module.exports = handler