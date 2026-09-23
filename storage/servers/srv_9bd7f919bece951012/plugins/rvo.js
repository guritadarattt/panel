const handler = async (Gurita, m) =>{
  if (!m.quoted) return Gurita.sendMessage(m.chat, {text: "reply media"})
  if (!m.quoted.viewOnce) return Gurita.sendMessage(m.chat, {text: "itu bukan media view once"})
    try{
  const media = await Gurita.downloadAndSaveMediaMessage(m.quoted)
  if (m.quoted.mtype == "imageMessage"){
    await Gurita.sendMessage(m.chat, { image: { url: media }, caption: m.quoted.caption , fileLength: 9999999999999999999999999}, { quoted: m })
  }else if (m.quoted.mtype == "videoMessage"){
    await Gurita.sendMessage(m.chat, { video: { url: media }, caption: m.quoted.caption ,fileLength: 9999999999999999999999999}, { quoted: m })
  }else{
    await Gurita.sendMessage(m.chat, { audio: { url: media }, mimetype: "audio/mpeg", fileLength: 9999999999999999999999999 , ptt : true  }, { quoted: m })
  }
}catch (e){
  Gurita.sendMessage(m.chat,{text:e.toString()})
}
}
handler.cmd = ['rvo']
handler.nama = "rvo"
handler.on = "fun"
handler.help = "rvo <reply media sekali lihat>"
module.exports = handler