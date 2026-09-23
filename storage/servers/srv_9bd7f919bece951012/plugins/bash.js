const { execSync } = require('child_process')

const handler = async (Gurita, m) =>{
  if (!m.isOwner) { Gurita.sendMessage(m.chat, {text: "hanya owner yang bisa menggunakan command ini"})
return "sender bukan owner"
}
  
  const cmd = m.text.split(" ").slice(1).join(" ")
  if (!cmd){ Gurita.sendMessage(m.chat, {text: "masukan command"})
return "masukkan command"}
  try{
  const result = await execSync(cmd).toString()
  await Gurita.sendMessage(m.chat, {text: result})
return result
  }catch (e){
    await Gurita.sendMessage(m.chat, {text: e.message})
return e.message
  }
}
handler.cmd = ['bash','shell','exec']
handler.nama = "bash"
handler.on = "owner"
handler.help = "bash <command>"
module.exports = handler