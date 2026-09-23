const handler = async (Gurita, m) =>{
  if (!m.isGroup) return Gurita.sendMessage(m.chat, {text: "hanya bisa digunakan di grup"})
  if (!m.isAdmin && !m.isOwner) return Gurita.sendMessage(m.chat, {text: "hanya admin yang bisa menggunakan command ini"})
  if (!m.isBotAdmin) return Gurita.sendMessage(m.chat, {text: "bot bukan admin"})
  try{
    await Gurita.groupSettingUpdate(m.chat, "not_announcement")
    await Gurita.sendMessage(m.chat, {text: "berhasil membuka grup"})
  }catch(e){
    await Gurita.sendMessage(m.chat, {text: e.message})
  }
}
handler.cmd = ['open']
handler.nama = "open"
handler.on = "grup"
handler.help = "open"
module.exports = handler