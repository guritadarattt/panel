const handler = async (Gurita, m) =>{
  if (!m.isGroup) return Gurita.sendMessage(m.chat, {text: "hanya bisa digunakan di grup"})
  if (!m.isAdmin && !m.isOwner) return Gurita.sendMessage(m.chat, {text: "hanya admin yang bisa menggunakan command ini"})
  if (!m.isBotAdmin) return Gurita.sendMessage(m.chat, {text: "bot bukan admin"})
  const num = m.quoted?.sender || m.mentionedJid[0] || undefined
  if (num == undefined) return Gurita.sendMessage(m.chat, {text: "reply/tag target"})
  try{
    Gurita.groupParticipantsUpdate(m.chat, [num], "promote")
  await Gurita.sendMessage(m.chat, {text: "berhasil mempromote member"})
}
  catch(e){
    await Gurita.sendMessage(m.chat, {text: e.message})
  }
}

handler.cmd = ['promote']
handler.nama = "promote"
handler.on = "grup"
handler.help = "promote <reply/tag target>"
module.exports = handler