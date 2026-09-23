//require("./lib/jidloader")
const qrcodeTerminal = require('qrcode-terminal')
const pino = require('pino')
//const { delay } = require('baileys')
const { execSync} = require('child_process')
const paircode = false
const rl = require('readline')
const chalk = require('chalk')
const { loadHandlers } = require('./lib/loader')
const fs = require('fs')
const path = require('path')
global.dbconn = {}
global.jidload = {}
const question = (text) =>{
    const rlInterface = rl.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rlInterface.question(text, (answer) => {
            rlInterface.close();
            resolve(answer);
        });
    });
}
global.grupInfo = {}
async function start(){
global.pitur = await loadHandlers(__dirname + '/plugins')
  const baileys = await import('baileys')
  const { default: makeWASocket, Browsers, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore, jidNormalizedUser, getContentType, downloadContentFromMessage, proto } = baileys
  const { delay } = baileys

  const { version, isLatest } = await fetchLatestBaileysVersion()
  const { state, saveCreds } = await useMultiFileAuthState('session')

  const Gurita = makeWASocket({
    printQRInTerminal: false,
    logger:  pino({
      level: 'silent',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: false,
          ignore: 'pid,hostname', // tambahkan filter
          levelFirst: false
        }
      }
    }),
    auth: state,
    browser: Browsers.ubuntu('chrome'),
    syncFullHistory: true,
    version: version
  })
 
  if (paircode && !Gurita.authState.creds.registered){
    
    const num = await question(chalk.green('masukan nomor : \n '))
      const pair = await Gurita.requestPairingCode(num)
      console.log(chalk.bgGreen(`kode anda adalah: ` + chalk.bold(pair.slice(0, 4) + '-' + pair.slice(4, 8)) ))

  }
Gurita.ev.on('connection.update', async (update) =>{
    const { connection, lastDisconnect, qr } = update
    const status = lastDisconnect?.error?.output?.statusCode

    if (qr && !paircode){
      qrcodeTerminal.generate(qr, { small: true })
    }
    
    if (connection === 'close'){
      const reason = Object.entries(DisconnectReason).find(i => i[1] === status)?.[0] || 'Tidak diketahui'
      if(status==408 && lastDisconnect?.error?.output?.payload?.message=="QR refs attempts ended"){
      execSync('rm -rf session')
        await delay(5000)
        process.exit()
       }else
      if(status==405 && lastDisconnect?.error?.data?.reason == '405' && lastDisconnect?.error?.output?.payload?.error=="Method Not Allowed" && lastDisconnect?.error?.output?.payload?.message=="Connection Failure" && lastDisconnect?.error.isServer==false){
        execSync('rm -rf session')
        await delay(5000)
        process.exit()
       }else if(status==403 && lastDisconnect?.error?.output?.payload?.error=="Forbidden"){
        execSync('rm -rf session')
        await delay(5000)
        process.exit()
       }else if(status==401/*||status==405*/){
        execSync('rm -rf session')
         await delay(5000)
        process.exit()
       }else if(status=="440"){
           await delay(5000)
          process.exit()
      }else if(connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401){
          await delay(5000)
        process.exit()
        }
    }else if (connection === 'open'){

      console.clear()
        console.log(chalk.bgGreen('connected'))
    }
  })
  

  Gurita.ev.on('creds.update', saveCreds)
  Gurita.ev.on("group-participants.update", async (update) =>{
console.log(update)
    const id = update.id
    grupInfo[id] = await Gurita.groupMetadata(id)
const { add, remove, promote, demote } = require('./lib/welcome')

    try {
    let participants = update.participants
    for (let num of participants) {

/*    //welcome\\
    if (update.action == 'add') {              
      add(Gurita, grupInfo[id], num)
    } else if (update.action == 'remove') {
      remove(Gurita, grupInfo[id], num)       
    } else if (update.action == 'promote') {
      promote(Gurita, grupInfo[id], num)
    } else if (update.action == 'demote') {
      demote(Gurita, grupInfo[id], num) 
    }*/
    }
    } catch (err) {
    console.log(err)
    }
  })

  let lastmsg
  Gurita.ev.on('messages.upsert', async (msg) =>{
    
      if ( msg.type !== 'notify') return
      
    for (let m of msg.messages){
      const debugmode = false
      if (m.key.id.startsWith('GURITA')) return
      if (debugmode) Gurita.sendMessage("6285704186408@s.whatsapp.net",{text:JSON.stringify(m)})//return console.log(JSON.stringify(m, undefined, 2))
     // console.log(m.key)
 if (m.message?.protocolMessage) return
      if (!m.message) return
      m.id = m.key.id
      if (lastmsg == m.id) return
      //console.log(m.key)
        if (m.key && m.key.remoteJid === 'status@broadcast'){
  return Gurita.readMessages([m.key])
}
// if (m.key.remoteJid === "status@whatsapp.net") return
await delay(3000)
  //      await Gurita.readMessages([m.key])
      lastmsg = m.id
      m.chat = m.key.remoteJid
      m.isGroup = m.chat.endsWith('@g.us')
      const sender = m.isGroup ? m.key.participant : m.key.remoteJid
   
        try{
      if ( sender.endsWith("@lid") && !jidload[sender]){
      if (m.isGroup){
      if (m.key.participantAlt){
      jidload[sender] = m.key.participantAlt
      }else{
      console.log("gagal mengambil id")
      }
      
      
      }else{
      if (m.key.remoteJidAlt){
      jidload[sender] = m.key.remoteJidAlt
      }else{
      console.log("gagal mengambil id")
      }
      }
      
      } }catch (e){
          console.log(e)
      }
      
      m.sender = jidload[sender] ? jidload[sender] : sender
      
       
      m.mtype = getContentType(m.message)
      m.text = m.message?.conversation || m.message?.extendedTextMessage?.text || m.message?.imageMessage?.caption || m.message?.videoMessage?.caption || m.message?.documentMessage?.caption || m.message?.listResponseMessage?.singleSelectReply ?.selectedRowId || m.message?.buttonsResponseMessage?.selectedButtonId || m.message?.templateButtonReplyMessage?.selectedId || m.message?.templateButtonReplyMessage?.selectedId || ( m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ? JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id : "" ) || ''

      const quoted = m.message[m.mtype]?.contextInfo?.quotedMessage || undefined
      if (quoted){
        let qtype = getContentType(quoted)
        m.quoted = qtype == "conversation" ? quoted : quoted[qtype]
        m.quoted.text = qtype == "conversation" ? quoted[qtype] : quoted[qtype].caption
        m.quoted.mtype = qtype
        m.quoted.chat = m.message?.contextInfo?.remoteJid || m.chat
        m.quoted.sender = m.message?.extendedTextMessage?.contextInfo?.participant
        m.quoted.id = m.message?.extendedTextMessage?.contextInfo?.stanzaId
        

        m.quoted.fakeObj = proto.WebMessageInfo.create({
            key: {
                remoteJid: m.quoted.chat,
                fromMe: m.quoted.fromMe,
                id: m.quoted.id
            },
            message: quoted,
            ...(m.isGroup ? {
                participant: m.quoted.sender
            } : {})
        })

      }
      m.idBot ={pn : Gurita.user.id.split(':')[0] + "@s.whatsapp.net",
               lid : Gurita.user.lid.split(':')[0] + "@lid"}
      
      m.isBot = m.key.fromMe ? true : m.sender== m.idBot.pn ? true : m.sender == m.idBot.lid
      
      m.isOwner = m.sender == "6285704186408@s.whatsapp.net" ? true : m.isBot ? true : false

      if (m.isGroup && grupInfo[m.chat] == undefined){
        grupInfo[m.chat] = await Gurita.groupMetadata(m.chat)
       
      }
      if (m.isGroup){
         m.groupMetadata = grupInfo[m.chat]
        m.isAdmin = m.groupMetadata.participants.find(i => i.id == m.sender)?.admin ||  m.groupMetadata.participants.find(i => i.id == m.senderLid)?.admin || m.isOwner
        m.isBotAdmin = m.groupMetadata.participants.find(i => i.id == m.idBot[m.groupMetadata.addressingMode])?.admin || m.groupMetadata.participants.find(i => i.id == m.idBot[m.groupMetadata.addressingMode])?.superadmin
      }
      
      

      m.prefix = "!"
      m.isCmd = m.text.startsWith(m.prefix)
      m.cmd = m.isCmd ? m.text.split(" ")[0].slice(1).toLowerCase() : ""
      m.excmd = m.prefix + m.cmd
      m.isCheckMsg = false
      m.reply =(teks) => Gurita.sendMessage(m.chat,{text:teks},{quoted:m})
      for (let handler of pitur){

        if (handler?.cmd?.indexOf(m.cmd) !== -1 && m.isCmd && typeof handler == "function" ){
          handler(Gurita,m)
          m.isCheckMsg === true
        }
if (!m.isCheckMsg){
        if (typeof handler.auto === 'function'){

          handler.auto(Gurita,m)
        }
        
      }}

      
  /*
  console.log(chalk.red("sender:" + m.sender))
  console.log(chalk.red("room:" + m.chat))
  console.log(chalk.red("cmd:" + m.cmd))*/
    }

  
    
  })

  // send message
  const originalSendMessage = Gurita.sendMessage
  Gurita.sendMessage = async (jid, content, options = {}) =>{
    const inTeks = content.text ? true : content.caption ? true : false
    if (inTeks){
      await Gurita.sendPresenceUpdate('composing', jid)
      await delay(3000)
    }
    options.messageId = "GURITA" + Date.now()
    const smsg = await originalSendMessage(jid, content, options)
    
    return smsg
  }
  // download media
  Gurita.downloadAndSaveMediaMessage = async (message) => {

    const dirdata = './tmp'

    if (!fs.existsSync(dirdata)) {
        fs.mkdirSync(dirdata, {
            recursive: true
        })
    }

    /*
     * Ambil payload message
     */

    const msg =
        message?.message?.[message?.mtype] ||
        message?.msg ||
        message

    /*
     * Ambil mimetype
     */

    const mime =
        msg?.mimetype ||
        message?.msg?.mimetype ||
        message?.mimetype ||
        ''

    /*
     * Tentukan type untuk Baileys
     *
     * imageMessage  -> image
     * videoMessage  -> video
     * audioMessage  -> audio
     * stickerMessage -> sticker
     * documentMessage -> document
     */

    let type

    if (message?.mtype) {

        type =
            message.mtype
                .replace(/Message$/, '')

    } else {

        type =
            mime.split('/')[0] ||
            'document'
    }

    /*
     * Validasi media
     */

    const allowed = [
        'image',
        'video',
        'audio',
        'sticker',
        'document'
    ]

    if (!allowed.includes(type)) {
        throw new Error(
            `Tipe media tidak didukung: ${type}`
        )
    }

    /*
     * Download stream
     */

    const stream =
        await downloadContentFromMessage(
            msg,
            type
        )

    let buffer =
        Buffer.alloc(0)

    for await (const chunk of stream) {

        buffer =
            Buffer.concat([
                buffer,
                chunk
            ])
    }

    /*
     * Tentukan extension
     */

    let ext = 'bin'

    if (type === 'image') {

        if (
            mime.includes('png')
        ) {
            ext = 'png'
        } else if (
            mime.includes('webp')
        ) {
            ext = 'webp'
        } else {
            ext = 'jpg'
        }

    } else if (type === 'video') {

        if (
            mime.includes('webm')
        ) {
            ext = 'webm'
        } else {
            ext = 'mp4'
        }

    } else if (type === 'audio') {

        if (
            mime.includes('ogg')
        ) {
            ext = 'ogg'
        } else if (
            mime.includes('opus')
        ) {
            ext = 'opus'
        } else if (
            mime.includes('wav')
        ) {
            ext = 'wav'
        } else {
            ext = 'mp3'
        }

    } else if (type === 'sticker') {

        ext = 'webp'

    } else if (type === 'document') {

        /*
         * Jangan lagi pakai:
         *
         * message.message.documentMessage
         *
         * karena message.message bisa undefined.
         */

        const documentMime =
            msg?.mimetype ||
            mime ||
            ''

        /*
         * Ambil extension dari mimetype
         */

        const mimeExt =
            documentMime
                .split('/')
                .pop()

        if (
            mimeExt &&
            mimeExt !== 'octet-stream'
        ) {

            ext =
                mimeExt
                    .split(';')[0]
                    .replace(/[^a-zA-Z0-9]/g, '') ||
                'bin'
        }

        /*
         * Kalau ada filename asli,
         * coba ambil extension-nya.
         */

        const originalName =
            msg?.fileName ||
            message?.fileName

        if (originalName) {

            const originalExt =
                path
                    .extname(originalName)
                    .replace('.', '')

            if (originalExt) {
                ext = originalExt
            }
        }
    }

    /*
     * Filename
     */

    const filename =
        path.join(
            dirdata,
            `${Date.now()}.${ext}`
        )

    /*
     * Simpan
     */

    await fs.promises.writeFile(
        filename,
        buffer
    )

    return filename
}
  const { Sticker, StickerTypes } = require("wa-sticker-formatter");

Gurita.sendSticker = async (
  id,
  path,
  setting = { packname: "Gurita Bot", author: "" }
) => {
  try {
    const sticker = new Sticker(path, {
      pack: setting.packname || "Gurita Bot",
      author: setting.author || "",
      type: StickerTypes.FULL,
      quality: 100,
    });

    await Gurita.sendMessage(id, {
      sticker: await sticker.toBuffer(),
    });

    return true;
  } catch (e) {
    console.error("Error sendSticker:", e);
    return false;
  }
};
}
start()
