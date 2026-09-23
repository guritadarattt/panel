const handler = async (Gurita, m) =>{
  if (!m.isOwner) return Gurita.sendMessage(m.chat, {text: "hanya owner yang bisa menggunakan command ini"})
  await Gurita.sendMessage(m.chat, {text: "restarting..."})
  process.exit()
}
handler.cmd = ['restart']
handler.nama = "restart"
handler.on = "owner"
handler.help = "restart"
module.exports = handler