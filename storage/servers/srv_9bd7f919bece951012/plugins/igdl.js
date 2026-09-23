const {igdl} = require("btch-downloader")

const handler = async (Gurita , m) =>{
    if (!m.text.split(" ")[1]) return Gurita.sendMessage(m.chat,{text:"masukkan url"},{quoted:m})
    if (!m.text.split(" ")[1].startsWith("https")) return Gurita.sendMessage(m.chat,{text:"masukkan url yang valid"},{quoted:m})
    const res = await igdl(m.text.split(" ")[1])
    if (res.status){
        for (let i of res.result){
            try{
        Gurita.sendMessage(m.chat,{video:{url:i.url}})
    }catch (e){
        Gurita.sendMessage(m.chat,{text: e})
    }
}
}else{
        Gurita.sendMessage(m.chat,{text:"kesalahan saat mengunggah video"})
    }
}

handler.cmd = ["igdl"]
handler.nama = "igdl"
handler.on = "download"
handler.help = "igdl <url>"
module.exports = handler