const fs = require("fs");

const handler = async (Gurita, m) => {
 const msg = m.quoted ? m.quoted : m
    const type = msg.mtype;

    if (!["imageMessage", "videoMessage"].includes(type)) {
        return Gurita.sendMessage(
            m.chat,
            { text: "Kirim/Reply foto atau video." },
            { quoted: m }
        );
    }

    const file = await Gurita.downloadAndSaveMediaMessage(msg);

    try {
        await Gurita.sendSticker(m.chat, file);
    } finally {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    }
};

handler.cmd = ["s", "sticker"];
handler.nama = "sticker";
handler.on = "basic";
handler.help = "sticker <reply media>";

module.exports = handler;