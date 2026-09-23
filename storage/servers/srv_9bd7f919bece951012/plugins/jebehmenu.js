const moment = require('moment-timezone')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// ==================================================
// CONFIG
// ==================================================

const config = {
    ownername: "GURITA DARAT",

    payment: {
        dana: "08xxxxxxxxxx",
        ovo: "08xxxxxxxxxx",
        gopay: "08xxxxxxxxxx"
    },

    qris: "https://raw.githubusercontent.com/GroundogArpasCt/botconfig/refs/heads/main/qris.jpg",

    channel: {
        id: "120xxxxxxxx@g.us"
    }
}

// ==================================================
// HANDLER
// ==================================================

const handler = async (Gurita, m) => {
try{
const prefix = m.prefix
const command = m.cmd
    const isCreator = m.isOwner
    const text = m.text.slice(m.excmd.length).trim() || ""
    const mime = m.mtype || ""
    const quoted = m.quoted


    switch (m.cmd) {

        // ==================================================
        // JEBEH MENU
        // ==================================================

        case 'jebehmenu': {
            let xtime = moment.tz('Asia/Jakarta').format('HH:mm:ss')
            let xdate = moment.tz('Asia/Jakarta').format('DD/MM/YYYY')

            let hmenu = `Halo ${m.pushName} ,

Saya *GURITA STORE*, saya adalah bot whatsapp yang diciptakan oleh ${config.ownername}

┏━⊜ menu jebeh ━⊜
父 ${m.prefix}pay
父 ${m.prefix}formatpost
父 ${m.prefix}formatneed
父 ${m.prefix}feerekber
父 ${m.prefix}formatpencairan
父 ${m.prefix}allrec
父 ${m.prefix}danamasuk
父 ${m.prefix}donerekber
父 ${m.prefix}mc
父 ${m.prefix}donemc
父 ${m.prefix}jpm
父 ${m.prefix}post
┗━━━━━━━━━━⬣͏͏͏͏͏͏͏͏

Tanggal : ${xdate}
Waktu : ${xtime} WIB
`

            m.reply(hmenu)
        }
        break


        // ==================================================
        // PAYMENT
        // ==================================================

        case 'pay': {
            let bayar = `*SCAN QR UNTUK MEMBAYAR*
            
  *DANA : ${config.payment.dana}*
  *OVO : ${config.payment.ovo}*
  *GOPAY : ${config.payment.gopay}*`

            await Gurita.sendMessage(m.chat, {
                image: {
                    url: config.qris
                },
                caption: bayar,
                fileLength: "99999999999999999999",
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,

                    forwardedNewsletterMessageInfo: {
                        newsletterJid: config.channel.id,
                        newsletterName: config.ownername,
                        serverMessageId: 143
                    }
                }
            }, {
                quoted: m
            })
        }
        break


        // ==================================================
        // FORMAT POST
        // ==================================================

        case 'formatpost': {
            if (!isCreator) return m.reply("hanya owner")

            let text12 = `🥀FORMAT JASPOST BY ${config.ownername}🥀
(BUKAN AKUN MILIK ADMIN)
                   
JUAL AKUN :
SPEK :
HARGA:
MC :
NOMER : wa.me/


NOTE‼️: WAJIB MENGGUNAKAN JASA ADMIN ${config.ownername} AGAR TERHINDAR DARI PENIPUAN


🥀BEE SMART BUYER🥀`

            m.reply(text12)
        }
        break


        // ==================================================
        // FORMAT NEED
        // ==================================================

        case 'formatneed': {
            if (!isCreator) return m.reply("hanya owner")

            let text12 = `*FORMAT JASA NEED AKUN BY ${config.ownername}*
*( BUKAN AKUN ADMIN )*

NAMA PEMILIK : 
AKUN : 
LOGIN : 
HARGA : 
SPEK AKUN : 
MC : 
  
*#TIDAK MENERIMA KIRKON*

📝𝐍𝐎𝐓𝐄 : 
*WAJIB MENGGUNAKAN JASA ADMIN ${config.ownername} UNTUK MENGHINDARI PENIPUAN*

*PERINGATAN ⚠️*
*MOHON NAMA PEMILIK AKUNNYA HARUS DI ISI DENGAN BENAR AGAR SELLER GAMPANG DI CARI*`

            m.reply(text12)
        }
        break


        // ==================================================
        // FEE REKBER
        // ==================================================

        case 'feerekber': {
            if (!isCreator) return m.reply("hanya owner")

            let text12 = `FEE BER² ${config.ownername}

•0 - 99K ≠ 5K
•99K - 150K ≠ 10K
•151K - 200K ≠ 15K
•201K - 324K ≠ 20K
•325K - 400K ≠ 25K
•401K - 500K ≠ 30K
•501K - 599K ≠ 35K
•600K - 699K ≠ 40K
•700K - 799K ≠ 45K
•800K - 1JT ≠ 50K
•1,1JT - 1,7JT ≠ 70K
•1,8JT - 2,5JT ≠ 100K
•BTBER ≠ 50K 
•TTBEB ≠ 50K`

            m.reply(text12)
        }
        break


        // ==================================================
        // FORMAT PENCAIRAN
        // ==================================================

        case 'formatpencairan': {
            if (!isCreator) return m.reply("hanya owner")

            let text12 = `FORMAT PENCAIRAN ${config.ownername}

Pencairan : 
No pay    : 
Atas nama :

KESALAHAN PADA NOMOR PENCAIRAN BUKAN JADI TANGGUNG JAWAB KAMI TOLONG DI CEK DENGAN DETAIL DAN SEBENAR-BENARNYA AGAR TIDAK TERJADI KESALAHAN YANG TIDAK DI INGINKAN KESALAHAN PADA NOMOR PENCAIRAN KAMI TIDAK AKAN BERTANGGUNG JAWAB`

            m.reply(text12)
        }
        break


        // ==================================================
        // ALL RECORD
        // ==================================================

        case 'allrec': {
            if (!isCreator) return m.reply("hanya owner")

            let text12 = `REKAM LAYAR!

> HAPUS SEMUA PESAN GMAIL
> KOSONGKAN SEMUA SAMPAH GMAIL
> HAPUS AKUN FB DARI PERANGKAT
> LOGOUT FF/ML/PUBG/APAPUN ITU

*BY* ${config.ownername}`

            m.reply(text12)
        }
        break


        // ==================================================
        // DANA MASUK
        // ==================================================

        case 'danamasuk': {
            if (!isCreator) return m.reply("hanya owner")

            let text12 = `DANA MASUK!

SILAHKAN SEND DATA SECARA PRIBADI KALO SUDAH DONE DAN DATA SUDAH DI AMANKAN SILAHKAN KETIK DONE KE GRUP BESERTA BUKTI SS LOGIN AKUN AGAR DANA BISA DI CAIRKAN KE PENJUAL UNTUK PENJUAL SILAHKAN KETIK .formatpencairan LALU ISI DENGAN BENAR AGAR KAMI TIDAK SALAH MENCAIRKAN DANA KESALAHAN DI TANGGUNG PENJUAL

X TRX BATAL FEE TETEP KEPOTONG X
BE SMART BUYER AND SELLER`

            m.reply(text12)
        }
        break


        // ==================================================
        // DONE REKBER
        // ==================================================

        case 'donerekber': {
            if (!isCreator) return m.reply("hanya owner")

            let text12 = `ALL TRX DONE ✅
 

   BUUYER : ✅
   SELLEER : ✅


NOTE ⛔ : JIKA ADA KENDALA DI LAIN WAKTU ADMIN SUDAH TIDAK BERTANGGUNG JAWAB ❗❗


TERIMA KASIH SUDAH BERBELANJA DI ${config.ownername}`

            m.reply(text12)
        }
        break


        // ==================================================
        // CREATE MC
        // ==================================================

        case 'mc': {
            let xtime = moment.tz('Asia/Jakarta').format('HH:mm:ss')
            let xdate = moment.tz('Asia/Jakarta').format('DD/MM/YYYY')

            if (!isCreator) return m.reply("hanya owner")

            if (!text) {
                return m.reply(`salah contoh .mc 250k by ${config.ownername}`)
            }

            let cret = await Gurita.groupCreate(text, [])

            console.log(cret)

            let response = await Gurita.groupInviteCode(cret.id)

            let tekss = `「 *Create Group Mc By ${config.ownername}* 」

GRUP MC SUDAH DI BUAT ATAS NAMA *${text}* SILAHKAN MASUK MELALUI LINK YANG ADA DI BAWAH YAH GENGS

*⥁* Name : ${cret.subject}
*⥁* MC BY : ${config.ownername}
*⥁* Creation : ${xdate}, ${xtime} WIB
*⥁* Link : https://chat.whatsapp.com/${response}
`

            m.reply(tekss)
        }
        break


        // ==================================================
        // DONE MC
        // ==================================================

        case 'donemc': {
            let xtime = moment.tz('Asia/Jakarta').format('HH:mm:ss')
            let xdate = moment.tz('Asia/Jakarta').format('DD/MM/YYYY')

            if (!isCreator) return m.reply("hanya owner")

            let t = text.split(',')

            if (t.length < 2) {
                return m.reply(`*Format salah!*

Penggunaan:
${prefix + command} item,nominal`)
            }

            let item = t[0]
            let nominal = t[1]

            let text12 = `*ALHAMDULILAH ALL TRX DONE ✅*
*TERIMA KASIH ATAS KEPERCAYAANYA*
*TELAH MENGGUNAKAN JASA ADMIN ${config.ownername}*

*ITEM : ${item}*
*TANGGAL : ${xdate}*
*NOMINAL : ${nominal}*
*WAKTU : ${xtime}*
*SISTEM : MC*
*BUYYER : DONE✅*
*SELLER : DONE✅*

*JIKA KEDUANYA TELAH DONE,MAKA JIKA ADA SESUATU YANG TERJADI DI LAIN HARI BUKAN TANGGUBG JAWAB ADMIN LAGI !!!*

*TERIMA KASIH TELAH MENGGUNAKAN JASA ADMIN ${config.ownername}*`

            m.reply(text12)
        }
        break


        // ==================================================
        // JPM / POST
        // ==================================================

        case 'jpm':
        case 'post': {
            if (!isCreator) return m.reply('khusus owner')

            if (!text) {
                return m.reply(`*Incorrect Usage Please Use Like This*

${prefix + command} text|pause

reply Image To Send Images to All Groups
For a pause, 1000 = 1 second

Example: ${prefix + command} hello|9000`)
            }

            await m.reply('In progress...')

            let getGroups = groupInfo

            let groups = Object.entries(getGroups)
                .slice(0)
                .map(entry => entry[1])

            let anu = groups.map(v => v.id)

            if (/image/.test(mime)) {

                let media = await Gurita.downloadAndSaveMediaMessage(quoted)

                for (let xnxx of anu) {

                    let metadat72 = await Gurita.groupMetadata(xnxx)

                    let participanh = metadat72.participants

                    await Gurita.sendMessage(xnxx, {
                        image: {
                            url: media
                        },
                        caption: text.split('|')[0],
                        mentions: participanh.map(a => a.id)
                    })

                    await sleep(text.split('|')[1])
                }

            } else {

                for (let xnxx of anu) {

                    let metadat72 = await Gurita.groupMetadata(xnxx)

                    let participanh = metadat72.participants

                    await Gurita.sendMessage(xnxx, {
                        text: text.split('|')[0],
                        mentions: participanh.map(a => a.id)
                    })

                    await sleep(text.split('|')[1])
                }
            }

            m.reply('Success')
        }
        break

    }
    }catch (e){
    m.reply(e.message)
    }
}


// ==================================================
// COMMAND LIST
// ==================================================

handler.cmd = [
    "jebehmenu",
    "pay",
    "formatpost",
    "formatneed",
    "feerekber",
    "formatpencairan",
    "allrec",
    "danamasuk",
    "donerekber",
    "mc",
    "donemc",
    "jpm",
    "post"
]

handler.nama = "jebehmenu"
handler.on = "tools"
handler.help = "jebehmenu"

module.exports = handler