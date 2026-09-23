const handler = async (Gurita, m) => {

    try {
        // Kirim pesan sebagai Group Status tanpa Baileys mod
        const sendStoryGc = async (id, med) => {
            let content

            if (med.text) {
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

            const media = await Gurita.downloadAndSaveMediaMessage(m)

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

            const media = await Gurita.downloadAndSaveMediaMessage(m)

            msg = {
                video: {
                    url: media
                },
                caption: m.text.split(m.excmd)[1] || ""
            }

        }

        else {
            return m.reply("hanya teks foto dan video")
        }

        // =========================
        // AMBIL SEMUA GRUP
        // =========================
        const getGroup = await Gurita.groupFetchAllParticipating()
        const allGroup = Object.keys(getGroup)

        const sent = await Gurita.sendMessage(
            m.chat,
            {
                text: "mengirim jpm"
            }
        )

        // =========================
        // KIRIM KE SEMUA GRUP
        // =========================
        for (let c = 0; c < allGroup.length; c++) {

            const i = allGroup[c]

            await Gurita.sendMessage(
                m.chat,
                {
                    text: `mengirim : ${c + 1} dari ${allGroup.length} grup`,
                    edit: sent.key
                }
            )

            await sendStoryGc(i, msg)
        }

        // =========================
        // SELESAI
        // =========================
        await Gurita.sendMessage(
            m.chat,
            {
                text: `selesai, berhasil mengirim ke ${allGroup.length} grup`,
                edit: sent.key
            }
        )

    } catch (e) {
        console.error(e)
        m.reply(e.toString())
    }
}

handler.cmd = ["jpmsw"]
handler.nama = "jpmsw"
handler.on = "tools"
handler.help = "jpmsw <text>"

module.exports = handler