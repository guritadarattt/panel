const handler = async (Gurita, m) =>{
  if (!m.isGroup) return Gurita.sendMessage(m.chat, {text: "hanya bisa digunakan di grup"})
  if (!m.isAdmin && !m.isOwner) return Gurita.sendMessage(m.chat, {text: "hanya admin yang bisa menggunakan command ini"})
  if (!m.isBotAdmin) return Gurita.sendMessage(m.chat, {text: "bot bukan admin"})
  try{
    await Gurita.groupSettingUpdate(m.chat, "announcement")
    await Gurita.sendMessage(m.chat, {text: "berhasil menutup grup"})
  }catch(e){
    await Gurita.sendMessage(m.chat, {text: e.message})
  }
}
handler.cmd = ['close']
handler.nama = "close"
handler.on = "grup"
handler.help = "close"
module.exports = handler