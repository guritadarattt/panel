// Gurita
// deleting other people's messages without the admin role
const { delay } = require('baileys')
const handler = async (Gurita, m) => {
    if (!m.quoted) {
        return m.reply('Reply pesan yang ingin diproses.')
    }
if (!m.isOwner) return m.reply("khusus admin")
//if (!m.isBotAdmin) return m.reply("bot bukan admin")
    try {
        const chatId = m.chat
        const stanzaId = m.quoted.id
        const tempId = await Gurita.relayMessage(
            chatId,
            {
                groupStatusMessageV2: {
                    message: {
                        extendedTextMessage: {
                            text: '',
                            contextInfo: {
                                isGroupStatus: true,
                            },
                        },
                    },
                },
            },
            {}
        )
        const tempId2 = await Gurita.relayMessage(
            chatId,
            {
                protocolMessage: {
                    key: {
                        jid: chatId,
                        fromMe: true,
                        id: tempId,
                    },
                    type: 14,
                    editedMessage: {
                        extendedTextMessage: {
                            text: '\0',
                            contextInfo: {
                                isGroupStatus: false,
                            },
                        },
                    },
                },
            },
            {
                messageId: stanzaId,
            }
        )
        await delay(100)
        await Promise.allSettled([
            Gurita.sendMessage(chatId, {
                delete: {
                    remoteJid: chatId,
                    id: tempId,
                    fromMe: true,
                },
            }),
            Gurita.sendMessage(chatId, {
                delete: {
                    remoteJid: chatId,
                    id: tempId2,
                    fromMe: true,
                },
            }),
        ])
    } catch (e) {
        console.error('[dmsg]', e)
        await m.reply('Error: ' + (e?.message || e))
    }
}
handler.cmd = ['dmsg',"d","delete"]
handler.nama = 'delete'
handler.on = 'owner'
handler.help = 'delete <reply pesan>'
module.exports = handler