// plugins/tools/obfuscator.js
const JavaScriptObfuscator = require('javascript-obfuscator')
const handler = async (Gurita, m) => {
    try {
        // ==============================
        // AMBIL TEXT
        // ==============================
        let text = m.text || ''
        // Hapus command di awal
        text = text.replace(
            m.excmd,
            ''
        )
        // ==============================
        // SUPPORT CODE BLOCK
        // ==============================
        // Contoh:
        // .obfuscator ```js
        // const x = 10
        // console.log(x)
        // ```
        //
        // atau:
        // .obfuscator ```
        // const x = 10
        // ```
        text = text.trim()
        if (text.startsWith('```') && text.endsWith('```')) {
            text = text
                .replace(/^```(?:js|javascript)?\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim()
        }
        const code = text
        // ==============================
        // CEK CODE
        // ==============================
        if (!code) {
            return m.reply(
                '❌ Masukkan kode JavaScript yang ingin di-obfuscate.\n\n' +
                'Contoh 1:\n' +
                '.obfuscator const fs = require("fs")\n\n' +
                'Contoh 2:\n' +
                '.obfuscator ```js\n' +
                'const fs = require("fs")\n' +
                'const path = require("path")\n\n' +
                'console.log("Hello World")\n' +
                '```'
            )
        }
        // ==============================
        // PROSES
        // ==============================
        await m.reply(
            '⏳ Sedang melakukan obfuscation...\n' +
            `📦 Ukuran source: ${formatBytes(Buffer.byteLength(code, 'utf8'))}`
        )
        const result = JavaScriptObfuscator.obfuscate(
            code,
            {
                // ==========================
                // BASIC
                // ==========================
                compact: true,
                // ==========================
                // CONTROL FLOW
                // ==========================
                controlFlowFlattening: true,
                controlFlowFlatteningThreshold: 0.75,
                // ==========================
                // DEAD CODE
                // ==========================
                deadCodeInjection: true,
                deadCodeInjectionThreshold: 0.15,
                // ==========================
                // DEBUG
                // ==========================
                debugProtection: false,
                debugProtectionInterval: 0,
                disableConsoleOutput: false,
                // ==========================
                // IDENTIFIER
                // ==========================
                identifierNamesGenerator: 'hexadecimal',
                // ==========================
                // NUMBER
                // ==========================
                numbersToExpressions: true,
                // Jangan rename global agar
                // require/module/exports tetap aman
                renameGlobals: false,
                // ==========================
                // SELF DEFENDING
                // ==========================
                selfDefending: true,
                simplify: true,
                // ==========================
                // STRING
                // ==========================
                splitStrings: true,
                splitStringsChunkLength: 8,
                stringArray: true,
                stringArrayCallsTransform: true,
                stringArrayCallsTransformThreshold: 0.75,
                stringArrayEncoding: ['base64'],
                stringArrayIndexShift: true,
                stringArrayRotate: true,
                stringArrayShuffle: true,
                stringArrayWrappersCount: 1,
                stringArrayWrappersChainedCalls: true,
                stringArrayWrappersParametersMaxCount: 3,
                stringArrayWrappersType: 'function',
                stringArrayThreshold: 0.75,
                // ==========================
                // OBJECT
                // ==========================
                transformObjectKeys: true,
                // ==========================
                // UNICODE
                // ==========================
                unicodeEscapeSequence: false
            }
        )
        const output = result.getObfuscatedCode()
        // ==============================
        // BUAT BUFFER
        // ==============================
        const outputBuffer = Buffer.from(
            output,
            'utf8'
        )
        // ==============================
        // KIRIM HASIL
        // ==============================
        await Gurita.sendMessage(
            m.chat,
            {
                document: outputBuffer,
                mimetype: 'text/javascript',
                fileName: 'obfuscated.js',
                caption:
                    '✅ *Obfuscation berhasil!*\n\n' +
                    `📄 Output: obfuscated.js\n` +
                    `📦 Source: ${formatBytes(Buffer.byteLength(code, 'utf8'))}\n` +
                    `📦 Output: ${formatBytes(outputBuffer.length)}`
            }
        )
    } catch (err) {
        console.error('[OBFUSCATOR]', err)
        return m.reply(
            '❌ *Gagal melakukan obfuscation!*\n\n' +
            `Error: ${err?.message || err}`
        )
    }
}
// =====================================
// FORMAT BYTES
// =====================================
function formatBytes(bytes) {
    if (!bytes || bytes <= 0) {
        return '0 B'
    }
    const units = [
        'B',
        'KB',
        'MB',
        'GB'
    ]
    const index = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1
    )
    return (
        (bytes / Math.pow(1024, index))
            .toFixed(2)
            .replace(/\.00$/, '') +
        ' ' +
        units[index]
    )
}
// =====================================
// PLUGIN CONFIG
// =====================================
handler.cmd = [
    'obfuscator',
    'obfuscate',
    'obf'
]
handler.nama = 'obfuscator'
handler.on = 'tools'
handler.help =
    'obfuscator <code> '
module.exports = handler