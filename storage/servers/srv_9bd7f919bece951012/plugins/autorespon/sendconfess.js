
const handler = {}
handler.auto = async (Gurita,m) =>{
    if (m.isGroup) return
    const cek1 = Object.keys(global.dbconn).includes(m.sender)
    const cek2 = Object.values(global.dbconn).includes(m.sender)
    if (cek1){
        Gurita.sendMessage(dbconn[m.sender],{forward:m})
    }else if (cek2){
        let penerima
                for (let gg of Object.keys(dbconn) ){
                    if (global.dbconn[gg] == m.sender ){
                        penerima = gg
                    }
                }
    Gurita.sendMessage(penerima,{forward:m})
    }
}
module.exports = handler

