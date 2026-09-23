const handler = async (Gurita, m) =>{
  if (!m.isGroup) return Gurita.sendMessage(m.chat, {text: "hanya bisa digunakan di grup"})
  if (!m.isAdmin && !m.isOwner) return Gurita.sendMessage(m.chat, {text: "hanya admin yang bisa menggunakan command ini"})
  if (!m.isBotAdmin) return Gurita.sendMessage(m.chat, {text: "bot bukan admin"})
  const num = m.text.split(" ").slice(1).join(" ") || m.quoted?.sender || m.mentionedJid[0] || undefined
  if (num == undefined) return Gurita.sendMessage(m.chat, {text: "masukan / reply nomor"})
  const num2 = num.replace(/[^0-9]/g, '') + "@s.whatsapp.net"
  try{
    Gurita.groupParticipantsUpdate(m.chat, [num2], "add")
  await Gurita.sendMessage(m.chat, {text: "berhasil menambahkan member"})
      
}
  catch(e){
    await Gurita.sendMessage(m.chat, {text: e.message})
  }
}
handler.cmd = ['add']
handler.nama = "add"
handler.on = "grup"
handler.help = "add <reply nomor>"
module.exports = handler