const { sendInteractiveMessage } = require("baileys_helper")


const handler = async (Gurita, m ) =>{
  try{
const judul = m.text.slice((m.excmd).length).trim() || ""
if (!judul) {
m.reply("mana judulnya")
return "tidak ada judulnya"
}
const resyts = await require("btch-downloader").yts(judul)
let pilih =  resyts.result?.all || ""
if (pilih.length < 1) {
m.reply("kesalahan saat mencari judul")
return "kesalahan saat mencari judul"
}
let pushaud = [];
let pushvid = [];
let returnai = ""
let penghitung = 0
for(let eplay of pilih){
  let objaud = {
     "title": eplay.title,
     "description": `Kreator : ${eplay.author.name || 'tidak diketahui'}\nDurasi : ${eplay.timestamp}`,
     "id": `${m.prefix}ytmp3 ${eplay.url}`
    }
  let objvid = {
     "title": eplay.title,
     "description": `Kreator : ${eplay.author.name ||'tidak diketahui'}\nDurasi : ${eplay.timestamp}`,
     "id": `${m.prefix}ytmp4 ${eplay.url}`
    }
    pushaud.push(objaud)
    pushvid.push(objvid)
    penghitung += 1
    returnai += `${penghitung}. nama: ${eplay.title}\nurl: ${eplay.url}\n\n\n`
}


let listaud = {
 "title": "Playlist Musik",
 "sections": [
  {
   "title": "Download Audio MP3",
   "highlight_label": "Pilih Audio",
   "rows": pushaud
  }
 ]
}
     
 let listvid = {
 "title": "Playlist Video",
 "sections": [
  {
   "title": "Download Video MP4",
   "highlight_label": "Pilih Video",
   "rows": pushvid
  }
 ]
}
await sendInteractiveMessage(Gurita, m.chat, {
  text: 'ini adalah hasil youtube search',
  footer: 'yts by gurita',
  interactiveButtons: [
    {
      name: 'single_select',
      buttonParamsJson: JSON.stringify( listaud )
    },
        {
      name: 'single_select',
      buttonParamsJson: JSON.stringify( listvid )
    }
  ]
});
return returnai + `gunakan "${m.prefix}ytmp3 <url>" untuk kirim audio atau "${m.prefix}ytmp4 <url>" untuk kirim video`
}catch (e){
m.reply(e.message)
return e.message
}

                            }
handler.cmd = ["yts"]
handler.nama = "yts"
handler.on = "tools"
handler.help = "yts <judul>"
module.exports = handler