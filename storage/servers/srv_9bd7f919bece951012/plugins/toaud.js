const axios = require("axios")
const FormData = require("form-data")
const fs = require("fs")
const path = require("path")

const CONVERTER_URL = "https://gurita-converter.vercel.app"
const API_KEY = "mk_904f5097153c07056da56c0b27d3fc73951925a45fad5ee97d94234255c7910c"

const handler = async (Gurita,m) =>{

const msg = m.quoted || m 
if (msg.mtype !== "videoMessage") return m.reply("kirim/reply video")
const filePath = await Gurita.downloadAndSaveMediaMessage(msg)
    if (!fs.existsSync(filePath)) {
        throw new Error("File tidak ditemukan: " + filePath)
    }

    const form = new FormData()

    form.append("file", fs.createReadStream(filePath), {
        filename: path.basename(filePath),
        contentType: "video/mp4"
    })

    const response = await axios.post(
        `${CONVERTER_URL}/video/audio`,
        form,
        {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${API_KEY}`
            },

            maxContentLength: Infinity,
            maxBodyLength: Infinity,

            timeout: 120000
        }
    )

    Gurita.sendMessage(m.chat,{audio:{url:response.data.file.url},mimetype:"audio/mpeg"})

}
handler.cmd = ["toaud"]
handler.nama = "toaud"
handler.on = "tools"
handler.help = "toaud <kirim/reply vid>"

module.exports = handler