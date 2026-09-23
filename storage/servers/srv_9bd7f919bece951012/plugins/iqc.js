
const axios = require('axios');

const handler = async (Gurita,m) => {
  const [text, chatime, statusbartime] = m.text.replace(m.excmd, "").split('|').map(s => (s || '').trim());

  if (!text) {
    return Gurita.sendMessage(m.chat,{text:
      `Contoh:\n` +
      `${m.cmd} pans|01:11|02:22`},{quoted:m}
    );
  }

  await Gurita.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
  //https://api.zenzxz.my.id/api/maker/fakechatiphone?text=groundog.arpasct&chatime=9999&statusbartime=9999


  const url = `https://api.zenzxz.my.id/api/maker/fakechatiphone?text=${text}&chatime=${chatime || '01:11'}&statusbartime=${statusbartime || '02:22'}`;
  try{
  
  await Gurita.sendMessage(m.chat, { image: { url: url }, caption: '✅ Selesai' }, { quoted: m });
  await Gurita.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
  }catch (e){
    await Gurita.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

    await Gurita.sendMessage(m.chat, { text: 'Error' }, { quoted: m });

  }
};

handler.cmd = ['iqc'];
handler.nama = "iqc"
handler.on = "fun"
handler.help = "iqc <teks>|<chatime>|<statusbartime>"

module.exports = handler;