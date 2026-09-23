const {fbdown} = require("btch-downloader")

const handler = async (Gurita , m) =>{
    if (!m.text.split(" ")[1]) return Gurita.sendMessage(m.chat,{text:"masukkan url"},{quoted:m})
    if (!m.text.split(" ")[1].startsWith("https")) return Gurita.sendMessage(m.chat,{text:"masukkan url yang valid"},{quoted:m})
    const res = await fbdown(m.text.split(" ")[1])
    if (res.status){
        Gurita.sendMessage(m.chat,{video:{url:res.Normal_video}})
    }else{
        Gurita.sendMessage(m.chat,{text:"kesalahan saat mengunggah video"})
    }
}

handler.cmd = ["fbdl"]
handler.nama = "fbdl"
handler.on = "download"
handler.help = "fbdl <url>"
module.exports = handler