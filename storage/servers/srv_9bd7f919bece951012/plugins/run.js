
const handler = async (Gurita,m) =>{
  if (!m.isOwner) return "sender bukan owner"

    let format = require('util').format
let evaluate = false
try {
evaluate = await eval(`const evalspace = async()=>{${m.text.split(" ").slice(1).join(" ")};};evalspace()`);
try {
evaluate = format(evaluate)
} catch { }
} catch (e) {
evaluate = e.stack.toString();
};
await Gurita.sendMessage(m.chat, { text: format(evaluate) });
return format(evaluate)
}

handler.cmd = ['run','eval']
handler.nama = "run"
handler.on = "owner"
handler.help = "run <js>"
module.exports = handler