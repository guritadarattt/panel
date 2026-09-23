const handler = async (Gurita, m) =>{
  if (!m.isGroup) return Gurita.sendMessage(m.chat, {text: "hanya bisa digunakan di grup"})
  if (!m.isAdmin) return Gurita.sendMessage(m.chat, {text: "hanya admin yang bisa menggunakan command ini"})
  const members = m.groupMetadata.participants.map(i => i.id)
  const text = `TAGALL\nPESAN: ${m.text.split(" ").slice(1).join(" ") || ""}`
  const message = `${text}\n\n${members.map(i => `=> @${i.split("@")[0]}`).join("\n")}`
  await Gurita.sendMessage(m.chat, {text: message, mentions: members})
}

handler.cmd = ['tagall']
handler.nama = "tagall"
handler.on = "grup"
handler.help = "tagall <teks>"
module.exports = handler