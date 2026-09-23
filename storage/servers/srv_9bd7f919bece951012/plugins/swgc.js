const handler = async (Gurita, m) => {
    // =========================
    // CEK GRUP
    // =========================
    if (!m.isGroup) {
        return m.reply("❌ Perintah ini hanya bisa digunakan di grup.")
    }
    // =========================
    // CEK OWNER
    // =========================
    if (!m.isOwner) {
        return m.reply("❌ Perintah ini hanya bisa digunakan oleh owner.")
    }
    try {
        // =========================
        // KIRIM GROUP STATUS
        // =========================
        const sendStoryGc = async (id, med) => {
            let content
            // TEXT
            if (med.text !== undefined) {
                content = {
                    groupStatusMessageV2: {
                        message: {
                            extendedTextMessage: {
                                text: med.text
                            }
                        }
                    }
                }
            }
            // IMAGE
            else if (med.image) {
                content = {
                    groupStatusMessageV2: {
                        message: {
                            imageMessage: {
                                url: med.image.url,
                                caption: med.caption || ""
                            }
                        }
                    }
                }
            }
            // VIDEO
            else if (med.video) {
                content = {
                    groupStatusMessageV2: {
                        message: {
                            videoMessage: {
                                url: med.video.url,
                                caption: med.caption || ""
                            }
                        }
                    }
                }
            }
            await Gurita.relayMessage(
                id,
                content,
                {}
            )
        }
        let msg
        // =========================
        // TEXT
        // =========================
        if (m.mtype == "conversation") {
            msg = {
                text: m.text.split(m.excmd)[1] || ""
            }
        }
        // =========================
        // IMAGE
        // =========================
        else if (m.mtype == "imageMessage") {
            const media =
                await Gurita.downloadAndSaveMediaMessage(m)
            msg = {
                image: {
                    url: media
                },
                caption: m.text.split(m.excmd)[1] || ""
            }
        }
        // =========================
        // VIDEO
        // =========================
        else if (m.mtype == "videoMessage") {
            const media =
                await Gurita.downloadAndSaveMediaMessage(m)
            msg = {
                video: {
                    url: media
                },
                caption: m.text.split(m.excmd)[1] || ""
            }
        }
        else {
            return m.reply(
                "❌ Hanya bisa mengirim teks, foto, atau video."
            )
        }
        // =========================
        // KIRIM KE GRUP SAAT INI
        // =========================
        await sendStoryGc(
            m.chat,
            msg
        )
    } catch (e) {
        console.error("[SW]", e)
        return m.reply(
            "❌ " + (e?.message || e)
        )
    }
}
handler.cmd = ["swgc"]
handler.nama = "swgc"
handler.on = "tools"
handler.help = "swgc <text>"
module.exports = handler