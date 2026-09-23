const fs = require('fs')
const handler = async (Gurita, m) =>{
  if (!m.isOwner) return Gurita.sendMessage(m.chat, {text: "hanya owner yang bisa menggunakan command ini"})
  const sesi = fs.readdirSync('./session')
 await Gurita.sendMessage(m.chat, {text: `sampah sesion: ${sesi.length}`})
  for (let i of sesi){
    try{
      if (i !== "creds.json"){
    await fs.unlinkSync('./session/' + i)
  }}
    catch(e){
      console.log(e)
    }}
    await Gurita.sendMessage(m.chat, {text: "session berhasil dihapus"})
}
handler.cmd = ['dsesi']
handler.nama = "dsesi"
handler.on = "owner"
handler.help = "dsesi"
module.exports = handler