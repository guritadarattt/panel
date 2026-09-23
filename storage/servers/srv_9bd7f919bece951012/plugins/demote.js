const handler = async (Gurita, m) =>{
  if (!m.isGroup) return Gurita.sendMessage(m.chat, {text: "hanya bisa digunakan di grup"})
  if (!m.isAdmin && !m.isOwner) return Gurita.sendMessage(m.chat, {text: "hanya admin yang bisa menggunakan command ini"})
  if (!m.isBotAdmin) return Gurita.sendMessage(m.chat, {text: "bot bukan admin"})
  const num = m.quoted?.sender || m.mentionedJid[0] || undefined
  if (num == undefined) return Gurita.sendMessage(m.chat, {text: "reply/tag target"})

  try{
    Gurita.groupParticipantsUpdate(m.chat, [num], "demote")
  await Gurita.sendMessage(m.chat, {text: "berhasil mendemote member"})
}
  catch(e){
    await Gurita.sendMessage(m.chat, {text: e.message})
  }
}

handler.cmd = ['demote']
handler.nama = "demote"
handler.on = "grup"
handler.help = "demote <reply/tag target>"
module.exports = handler