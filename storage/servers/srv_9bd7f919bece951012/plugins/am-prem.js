const { getAmPrem , verifyAmPrem } = require("../lib/am-prem.js")

const handler = async (Gurita, m) =>{
try{
const text2 = m.text.slice(m.excmd.length).trim() || ''

if (m.cmd === "amprem"){
if (!text2) return m.reply(`gunakan: ${m.prefix}amprem <email>`)
const getPrem = await getAmPrem(text2.split(" ")[0])

if (!getPrem.status) return m.reply(getPrem.message)
m.reply(`magic link telah dikirim.
gunakan : ${m.prefix}verifyam <email>,<magic link>`)
}else{
if (!text2) return m.reply(`gunakan: ${m.prefix}verifyam <email>,<magic link>`)

const [ email, verifUrl] = text2.split(",")
if (!email || !verifUrl) return m.reply("email/magic link tidak boleh kosong")

const verify = await verifyAmPrem(email,verifUrl)

if (!verify.status) return m.reply("ada masalah saat menghubungi server")
m.reply(`selamat!! email ${email} sudah premium`)

}
}catch (e){
m.reply(e.message)
}
}
handler.cmd = ['amprem','verifyam']
handler.nama = "amprem"
handler.on = "tools"
handler.help = "amprem <email>  "
module.exports = handler