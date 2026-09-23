const { sendButtons } = require("baileys_helper")


const handler = async (Gurita, m) =>{
const url = m.text.slice(m.excmd.length).trim()
if (!url.startsWith("https")) return m.reply("url tidak valid")
const dattk = await require("btch-downloader").ttdl(url)
if (!dattk.status) return m.reply("ada masalah pada downloader")
if (m.cmd ==="tiktok"){



const buttons = [
                {
                  id: `${m.prefix}ttvid ${url}`,
                  text :"Video"
                },
                
                {
                  id: `${m.prefix}ttaud ${url}`,
                  text : "Audio"
                }
                
              ]
              
              await sendButtons(Gurita,m.chat,{
              title:"tiktok downloader",
              text:dattk.title,
              footer:"tiktok downloader by gurita",
              buttons: buttons
              })
}else if (m.cmd === "ttvid"){
  Gurita.sendMessage(m.chat,{video:{url:dattk.video[0]},caption:dattk.title})

}else{
Gurita.sendMessage(m.chat,{audio:{url:dattk.audio[0]},mimetype: "audio/mpeg"})



}

}
handler.cmd = ["tiktok","ttvid","ttaud"]
handler.nama = "tiktok"
handler.on = "download"
handler.help = "tiktok <url tiktok>"

module.exports = handler