const axios = require("axios");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

async function download(url) {
  const ext = path.extname(new URL(url).pathname) + "/tmp" || ".tmp";
    const filename = `${crypto.randomBytes(8).toString("hex")}${ext}`;
    
    const response = await axios({
        method: "GET",
        url: url,
        responseType: "stream"
    });

    const writer = fs.createWriteStream(filename);

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
        response.data.on("error", reject);
    });

    return filename;
}

const handler = async (Gurita, m ) =>{
const url = m.text.slice((m.excmd).length).trim() || ""
const { ytmp3 , ytmp4 } = require("@vreden/youtube_scraper")
if (m.cmd ==="ytmp3"){
try{
const dt = await ytmp3(url)
const data = dt.metadata
await Gurita.sendMessage(m.chat,{image:{url: data.image},caption:data.title})
await Gurita.sendMessage(m.chat,{audio:{url: dt.download.url},mimetype:"audio/mpeg"})
return "musik telah di kirim"
}catch (e){
m.reply(e.message)
return e.message
}
}else{
try{
const dt = await ytmp4(url)
const data = dt.metadata
await Gurita.sendMessage(m.chat,{image:{url: data.image},caption:data.title})
await Gurita.sendMessage(m.chat,{video:{url: await download(dt.download.url)}})
return "video telah dikirim"
}catch (e){
m.reply(e.message)
return e.message
}

}
                            }
handler.cmd = ["ytmp3", "ytmp4"]
handler.nama = "ytdl"
handler.on = "download"
handler.help = "ytmp4/ytmp3 <judul>"
module.exports = handler