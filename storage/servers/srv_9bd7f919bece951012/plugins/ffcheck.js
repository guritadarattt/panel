const axios = require("axios")

const handler = async (Gurita, m) =>{

const freply = {
key:{remoteJid: "0@s.whatsapp.net",
fromMe:false,
id:"FMSG"+ Date.now()
},
message:{
conversation:"check ff by gurita"
}
}
const uid = m.text.slice(m.excmd.length).trim() || ""
if (!uid) return m.reply("masukkan id ff")
try{
const { data } = await axios.get(`https://adenpedia.my.id/adencihuy/info.php?uid=${uid}`)
if (!data) return m.reply("error atau id salah")
const create = new Date(Number(data.basicInfo.createAt) * 1000)
const lastLog = new Date(Number(data.basicInfo.lastLoginAt) * 1000)



Gurita.sendMessage(m.chat,{text: `detail akun *${data.basicInfo.nickname}*
id : ${data.basicInfo.accountId}
region: ${data.basicInfo.region}
level: ${data.basicInfo.level}
prime:${data?.basicInfo.primeInfo?.primeLevel || "-"}
dibuat pada:${create.toLocaleDateString("id-ID",{
timeZone: "Asia/Jakarta",
day: "2-digit",
month: "long",
year: "numeric"
})}
terakhir login:${lastLog.toLocaleDateString("id-ID",{
timeZone: "Asia/Jakarta",
day: "2-digit",
month: "long",
year: "numeric",
hour: "2-digit",
minute: "2-digit"
})}
guild:${data.clanBasicInfo?.clanName || "-"}`},{quoted: freply})
}catch (e){
m.reply(e.message)
}
}
handler.cmd = ["ff"]
handler.nama = "ff"
handler.on = "tools"
handler.help = "ff <id ff>"

module.exports = handler