const fs = require('fs')
const handler = async (Gurita, m) =>{
  if (!m.isOwner) return Gurita.sendMessage(m.chat, {text: "hanya owner yang bisa menggunakan command ini"})
  const cache = fs.readdirSync('./tmp')
  for (let i of cache){
    try{
    fs.unlinkSync('./tmp/' + i)
  }
    catch(e){
      console.log(e)
    }}
    await Gurita.sendMessage(m.chat, {text: "cache berhasil dihapus"})
}
handler.cmd = ['dcache']
handler.nama = "dcache"
handler.on = "owner"
handler.help = "dcache"
module.exports = handler