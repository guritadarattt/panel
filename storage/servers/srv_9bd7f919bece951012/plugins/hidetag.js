const handler = async (Gurita,m) =>{
  if (!m.isGroup) return
  if (!m.isAdmin && !m.isOwner) return
  const msg = m.text.split(' ')?.slice(1)?.join(' ') || ''
  Gurita.sendMessage(m.chat, {text: msg, mentions: m.groupMetadata.participants.map(i => i.id)})
}

handler.cmd = ['hidetag']
handler.nama = "hidetag"
handler.on = "grup"
handler.help = "hidetag <teks>"
module.exports = handler