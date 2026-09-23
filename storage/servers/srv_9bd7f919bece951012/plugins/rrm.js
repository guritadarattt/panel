
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')


// ==================================================
// CONFIG
// ==================================================

const randomId = (length = 16) => {
    return crypto
        .randomBytes(length)
        .toString('hex')
        .slice(0, length)
}


// ==================================================
// DESERIALIZE
// ==================================================

const deserialize = (data, seen = new WeakSet()) => {

    if (
        data === null ||
        data === undefined
    ) {
        return data
    }

    // Buffer hasil CRM
    if (
        typeof data === 'object' &&
        data.__type === 'Buffer' &&
        typeof data.data === 'string'
    ) {
        return Buffer.from(
            data.data,
            'base64'
        )
    }

    if (Array.isArray(data)) {
        return data.map(item =>
            deserialize(item, seen)
        )
    }

    if (typeof data !== 'object') {
        return data
    }

    if (seen.has(data)) {
        return undefined
    }

    seen.add(data)

    const result = {}

    for (const [key, value] of Object.entries(data)) {

        const restored =
            deserialize(
                value,
                seen
            )

        if (restored !== undefined) {
            result[key] = restored
        }
    }

    seen.delete(data)

    return result
}


// ==================================================
// DETECT MESSAGE TYPE
// ==================================================

const getMessageType = (relay) => {

    // CRM v2
    if (relay?.message?.mtype) {
        return relay.message.mtype
    }

    // source.mtype
    if (relay?.source?.mtype) {
        return relay.source.mtype
    }

    // CRM v1 kemungkinan
    if (
        relay?.message &&
        typeof relay.message === 'object'
    ) {

        const knownTypes = [
            'conversation',
            'extendedTextMessage',
            'imageMessage',
            'videoMessage',
            'audioMessage',
            'stickerMessage',
            'documentMessage',
            'contactMessage',
            'contactsArrayMessage',
            'locationMessage',
            'liveLocationMessage',
            'reactionMessage',
            'pollCreationMessage',
            'pollUpdateMessage',
            'buttonsMessage',
            'listMessage',
            'templateMessage',
            'interactiveMessage'
        ]

        for (const type of knownTypes) {

            if (
                Object.prototype.hasOwnProperty.call(
                    relay.message,
                    type
                )
            ) {
                return type
            }
        }
    }

    return null
}


// ==================================================
// BUILD BAILEYS MESSAGE
// ==================================================

const buildMessage = (relay) => {

    const mtype =
        getMessageType(relay)

    if (!mtype) {
        throw new Error(
            'mtype tidak ditemukan di file CRM.'
        )
    }


    // ==============================================
    // VERSION 2
    // ==============================================

    if (
        relay.version >= 2 &&
        relay.message
    ) {

        const messageType =
            relay.message.type

        // ------------------------------------------
        // NORMAL MESSAGE
        // ------------------------------------------

        if (
            messageType === 'message'
        ) {

            if (
                relay.message.data === undefined
            ) {
                throw new Error(
                    'Payload message v2 tidak ditemukan.'
                )
            }

            const payload =
                deserialize(
                    relay.message.data
                )

            if (
                payload === null ||
                payload === undefined
            ) {
                throw new Error(
                    'Payload message v2 kosong.'
                )
            }

            return {
                [mtype]: payload
            }
        }


        // ------------------------------------------
        // MEDIA
        // ------------------------------------------

        if (
            messageType === 'media'
        ) {

            /*
             * Media v2 membutuhkan proses upload
             * kembali ke server WhatsApp.
             *
             * Payload media disimpan di:
             *
             * relay.message.data
             *
             * File binary disimpan di:
             *
             * relay.message.file.buffer
             */

            const mediaData =
                deserialize(
                    relay.message.data
                )

            const fileData =
                relay.message.file?.buffer

            if (!fileData) {
                throw new Error(
                    'Buffer media v2 tidak ditemukan.'
                )
            }

            return {
                __relayMedia: true,

                mtype,

                mediaData,

                buffer:
                    deserialize(
                        fileData
                    ),

                mimetype:
                    relay.message.file?.mimetype ||
                    mediaData?.mimetype ||
                    'application/octet-stream',

                fileName:
                    relay.message.file?.fileName ||
                    mediaData?.fileName ||
                    `${randomId(8)}.bin`
            }
        }


        // ------------------------------------------
        // UNKNOWN V2 FORMAT
        // ------------------------------------------

        if (
            relay.message.data !== undefined
        ) {

            const payload =
                deserialize(
                    relay.message.data
                )

            return {
                [mtype]: payload
            }
        }
    }


    // ==============================================
    // VERSION 1
    // ==============================================

    const oldMessage =
        deserialize(
            relay.message
        )

    if (
        !oldMessage ||
        typeof oldMessage !== 'object'
    ) {
        throw new Error(
            'Payload message v1 tidak valid.'
        )
    }


    // ----------------------------------------------
    // v1 sudah berupa:
    //
    // {
    //   extendedTextMessage: {...}
    // }
    // ----------------------------------------------

    if (
        oldMessage[mtype]
    ) {

        return {
            [mtype]:
                oldMessage[mtype]
        }
    }


    // ----------------------------------------------
    // v1 payload langsung
    //
    // {
    //   text: "hello"
    // }
    // ----------------------------------------------

    if (
        mtype === 'conversation'
    ) {

        if (
            typeof oldMessage.text === 'string'
        ) {

            return {
                conversation:
                    oldMessage.text
            }
        }
    }


    if (
        mtype === 'extendedTextMessage'
    ) {

        /*
         * Kalau ternyata message v1 masih
         * menyimpan payload text secara langsung.
         */

        if (
            typeof oldMessage.text === 'string'
        ) {

            return {
                extendedTextMessage: {
                    text:
                        oldMessage.text
                }
            }
        }
    }


    // ----------------------------------------------
    // v1 fakeObj
    // ----------------------------------------------

    const fakeMessage =
        oldMessage.fakeObj?.message

    if (
        fakeMessage &&
        typeof fakeMessage === 'object'
    ) {

        if (
            fakeMessage[mtype]
        ) {

            return {
                [mtype]:
                    deserialize(
                        fakeMessage[mtype]
                    )
            }
        }

        // Beberapa struktur pesan mungkin langsung
        // memakai conversation / extendedTextMessage.
        for (
            const key of Object.keys(fakeMessage)
        ) {

            if (
                key.endsWith('Message') ||
                key === 'conversation'
            ) {

                return {
                    [key]:
                        deserialize(
                            fakeMessage[key]
                        )
                }
            }
        }
    }


    // ----------------------------------------------
    // Tidak ditemukan
    // ----------------------------------------------

    throw new Error(
        `Payload ${mtype} tidak ditemukan dalam file CRM.`
    )
}


// ==================================================
// MEDIA RELAY
// ==================================================

const relayMedia = async (
    Gurita,
    jid,
    data
) => {

    /*
     * Media v2 disimpan sebagai Buffer.
     *
     * Kita kirim kembali menggunakan
     * sendMessage karena relayMessage
     * tidak menerima Buffer mentah sebagai
     * media payload.
     */

    const mediaType =
        data.mtype
            .replace(
                /Message$/,
                ''
            )

    const content = {}

    content[mediaType] =
        data.buffer

    content.mimetype =
        data.mimetype

    if (
        data.fileName &&
        mediaType === 'document'
    ) {
        content.fileName =
            data.fileName
    }

    await Gurita.sendMessage(
        jid,
        content
    )
}


// ==================================================
// HANDLER
// ==================================================

const handler = async (Gurita, m) => {

    if (!m.isOwner) return


    // ==============================================
    // CHECK REPLY
    // ==============================================

    if (!m.quoted) {

        return m.reply(
            '❌ Reply file JSON hasil command *crm*.'
        )
    }


    let filepath = null


    try {

        // ==========================================
        // DOWNLOAD JSON
        // ==========================================

        if (
            typeof Gurita.downloadAndSaveMediaMessage !==
            'function'
        ) {

            throw new Error(
                'downloadAndSaveMediaMessage tidak tersedia.'
            )
        }


        console.log(
            '[RRM] Downloading JSON...'
        )


        filepath =
            await Gurita.downloadAndSaveMediaMessage(
                m.quoted
            )


        if (
            !filepath ||
            !fs.existsSync(filepath)
        ) {

            throw new Error(
                'File JSON gagal didownload.'
            )
        }


        console.log(
            '[RRM] File:',
            filepath
        )


        // ==========================================
        // READ JSON
        // ==========================================

        const raw =
            fs.readFileSync(
                filepath,
                'utf8'
            )


        let relay

        try {

            relay =
                JSON.parse(raw)

        } catch {

            throw new Error(
                'File yang direply bukan JSON valid.'
            )
        }


        // ==========================================
        // VALIDATE
        // ==========================================

        if (
            relay?.type !==
            'GURITA_RELAY_MESSAGE'
        ) {

            throw new Error(
                'File bukan Relay Message hasil CRM.'
            )
        }


        console.log(
            '[RRM] CRM version:',
            relay.version
        )


        // ==========================================
        // DETECT TYPE
        // ==========================================

        const mtype =
            getMessageType(relay)


        if (!mtype) {

            throw new Error(
                'Tipe message tidak ditemukan.'
            )
        }


        console.log(
            '[RRM] Message type:',
            mtype
        )


        // ==========================================
        // BUILD MESSAGE
        // ==========================================

        const message =
            buildMessage(relay)


        // ==========================================
        // MEDIA
        // ==========================================

        if (
            message?.__relayMedia
        ) {

            console.log(
                '[RRM] Media detected.'
            )

            await relayMedia(
                Gurita,
                m.chat,
                message
            )

            console.log(
                `[RRM] Media berhasil dikirim ke ${m.chat}`
            )

            return
        }


        // ==========================================
        // NORMAL RELAY
        // ==========================================

        console.log(
            '[RRM] Relay payload:',
            JSON.stringify(
                message,
                (key, value) => {

                    if (
                        Buffer.isBuffer(value)
                    ) {
                        return {
                            type: 'Buffer',
                            length: value.length
                        }
                    }

                    return value
                },
                2
            )
        )


        await Gurita.relayMessage(
            m.chat,
            message,
            {
                messageId:
                    randomId(16)
            }
        )


        console.log(
            `[RRM] Relay berhasil dikirim ke ${m.chat}`
        )


    } catch (err) {

        console.error(
            '[RRM ERROR]',
            err
        )

        return m.reply(
            `❌ RRM Error:\n${err.message}`
        )


    } finally {

        // ==========================================
        // DELETE TEMP FILE
        // ==========================================

        try {

            if (
                filepath &&
                fs.existsSync(filepath)
            ) {

                fs.unlinkSync(
                    filepath
                )
            }

        } catch {}

    }
}


// ==================================================
// HANDLER CONFIG
// ==================================================

handler.cmd = ['rrm']
handler.nama = 'rrm'
handler.on = 'tools'
handler.help = 'rrm'

module.exports = handler
