const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const serialize = (data, seen = new WeakSet(), depth = 0) => {

    // Cegah object terlalu dalam
    if (depth > 50) {
        return undefined
    }

    // Buffer
    if (Buffer.isBuffer(data)) {
        return {
            __type: 'Buffer',
            data: data.toString('base64')
        }
    }

    // Uint8Array
    if (data instanceof Uint8Array) {
        return {
            __type: 'Buffer',
            data: Buffer.from(data).toString('base64')
        }
    }

    // Primitive
    if (
        data === null ||
        typeof data !== 'object'
    ) {
        return data
    }

    // Circular reference
    if (seen.has(data)) {
        return undefined
    }

    seen.add(data)

    // Array
    if (Array.isArray(data)) {
        const result = []

        for (const value of data) {
            const serialized = serialize(
                value,
                seen,
                depth + 1
            )

            if (serialized !== undefined) {
                result.push(serialized)
            }
        }

        return result
    }

    // Object
    const result = {}

    for (const [key, value] of Object.entries(data)) {

        try {

            const serialized = serialize(
                value,
                seen,
                depth + 1
            )

            if (serialized !== undefined) {
                result[key] = serialized
            }

        } catch (err) {

            console.log(
                `[CRM] Skip property: ${key}`,
                err.message
            )

        }
    }

    return result
}

const randomId = (length = 8) => {
    return crypto
        .randomBytes(length)
        .toString('hex')
        .slice(0, length)
}

const handler = async (Gurita, m) => {

    if (!m.isOwner) return

    if (!m.quoted) {
        return m.reply(
            '❌ Reply pesan yang ingin dibuat menjadi relay message.'
        )
    }

    let filepath

    try {

        const quoted = m.quoted

        /*
         * Ambil message sesuai struktur m.quoted
         */
        const message =
            quoted?.fakeObj?.message
                ? quoted.fakeObj.message
                : null

        if (!message) {
            return m.reply(
                '❌ Data pesan tidak ditemukan.'
            )
        }

        console.log(
            '[CRM] Message type:',
            quoted.mtype
        )

        console.log(
            '[CRM] Serializing...'
        )

        const serialized =
            serialize(message)

        if (serialized === undefined) {
            return m.reply(
                '❌ Gagal melakukan serialize message.'
            )
        }

        const relay = {

            type: 'GURITA_RELAY_MESSAGE',

            version: 1,

            createdAt: Date.now(),

            source: {

                jid:
                    quoted.key?.remoteJid ||
                    m.chat ||
                    null,

                participant:
                    quoted.key?.participant ||
                    null,

                messageId:
                    quoted.key?.id ||
                    null,

                fromMe:
                    quoted.key?.fromMe ||
                    false,

                mtype:
                    quoted.mtype ||
                    null
            },

            message: serialized
        }

        const filename =
            `relay-${randomId()}.json`

        filepath =
            path.join(
                process.cwd(),
                filename
            )

        fs.writeFileSync(
            filepath,
            JSON.stringify(
                relay,
                null,
                2
            ),
            'utf8'
        )

        console.log(
            '[CRM] JSON created:',
            filename
        )

        await Gurita.sendMessage(
            m.chat,
            {
                document:
                    fs.readFileSync(filepath),

                mimetype:
                    'application/json',

                fileName:
                    filename,

                caption:
                    '✅ Relay Message berhasil dibuat.\n\n' +
                    `📄 File: ${filename}\n` +
                    `🆔 ID: ${relay.source.messageId || '-'}\n` +
                    `📦 Type: ${relay.source.mtype || '-'}\n\n` +
                    'Reply file ini dengan command *rrm*.'
            },
            {
                quoted: m
            }
        )

    } catch (err) {

        console.error(
            '[CRM ERROR]',
            err
        )

        return m.reply(
            `❌ CRM Error:\n${err.message}`
        )

    } finally {

        if (filepath) {

            try {

                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath)
                }

            } catch {}

        }
    }
}

handler.cmd = ['crm']
handler.nama = 'crm'
handler.on = 'tools'
handler.help = 'crm'

module.exports = handler