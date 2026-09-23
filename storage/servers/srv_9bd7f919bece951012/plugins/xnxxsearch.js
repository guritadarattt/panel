const { sendInteractiveMessage } = require('baileys_helper');



const handler = async (Gurita ,m ) =>{
                            const text = m.text.split(" ").slice(1).join(" ")
                            if (!text) return m.reply('judul?');
                            const prn = await require("../lib/xnxx.js").xnxxsearch(text)
                            if(prn.result.length==0)return m.reply('video tidak ditemukan');
                            let pilih = prn.result
                            let pushprn = [];


                            for(let eplay of pilih){
                              let objplay = {
                                 "title": eplay.title,
                                 "description": eplay.title,
                                 "id": `${m.prefix}xnxxdl ${eplay.link}`
                                }

                                pushprn.push(objplay)

                            }

                            let listed = {
                             "title": "list video",
                             "sections": [
                              {
                               "title": "asupan",
                               "highlight_label": "Pilih video anda",
                               "rows": pushprn
                              }
                             ]
                            }
                   
await sendInteractiveMessage(Gurita, m.chat, {
  text: 'Silahkan pilih asupan anda',
  footer: 'asupan by gurita',
  interactiveButtons: [

    // Single select picker (list inside a button)
    {
      name: 'single_select',
      buttonParamsJson: JSON.stringify( listed )
    }
  ]
});



                            }
handler.cmd = ["xnxxsearch"]
handler.nama = "xnxxsearch"
handler.on = "tools"
handler.help = "xnxxsearch <judul>"
module.exports = handler
                            