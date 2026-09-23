const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

const { sendInteractiveMessage } = require("baileys_helper");


// ======================================================
// CONFIG
// ======================================================

const UPLOADER_URL = "https://gurita-uploader.vercel.app";
const UPLOADER_KEY = "bijikuda";


// ======================================================
// UPLOAD KE GURITA UPLOADER
// ======================================================

async function uploadToGurita(
    buffer,
    filename,
    mimetype
) {

    const form = new FormData();

    form.append("file", buffer, {
        filename,
        contentType:
            mimetype ||
            "application/octet-stream"
    });

    const response = await axios.post(
        `${UPLOADER_URL}/api/upload`,
        form,
        {
            headers: {
                ...form.getHeaders(),

                Authorization:
                    `Bearer ${UPLOADER_KEY}`
            },

            maxBodyLength: Infinity,
            maxContentLength: Infinity,

            timeout: 120000
        }
    );

    if (!response.data?.success) {
        throw new Error(
            response.data?.message ||
            "Upload gagal"
        );
    }

    return response.data;
}


// ======================================================
// HANDLER
// ======================================================

const handler = async (Gurita, m) => {

    let media = null;

    try {

        // ==================================================
        // CARI TARGET
        // ==================================================

        let target = null;

        const supportedTypes = [
            "imageMessage",
            "videoMessage",
            "audioMessage",
            "documentMessage",
            "stickerMessage"
        ];


        // Media langsung

        if (
            supportedTypes.includes(
                m.mtype
            )
        ) {

            target = m;

        }


        // Reply media

        else if (
            m.quoted &&
            supportedTypes.includes(
                m.quoted.mtype
            )
        ) {

            target = m.quoted;

        }


        // Bukan media

        else {

            return Gurita.sendMessage(
                m.chat,
                {
                    text:
                        "Kirim atau reply file/media yang ingin dibuat URL."
                }
            );

        }


        // ==================================================
        // DOWNLOAD
        // ==================================================

        media =
            await Gurita.downloadAndSaveMediaMessage(
                target
            );


        // Contoh:
        //
        // media =
        // "/tmp/dhidnd.png"
        //
        // atau:
        //
        // "/tmp/abc123.mp4"


        // ==================================================
        // NAMA FILE
        // ==================================================

        const filename =
            path.basename(media);


        // ==================================================
        // MIME TYPE
        // ==================================================

        let mimetype =
            "application/octet-stream";


        if (
            target.mimetype
        ) {

            mimetype =
                target.mimetype;

        }


        // ==================================================
        // BUFFER
        // ==================================================

        const buffer =
            fs.readFileSync(media);


        // ==================================================
        // UPLOAD
        // ==================================================

        const result =
            await uploadToGurita(
                buffer,
                filename,
                mimetype
            );


        // ==================================================
        // URL
        // ==================================================

        const teks =
            result.url.toString();


        // ==================================================
        // KIRIM HASIL
        // ==================================================

        await sendInteractiveMessage(
            Gurita,
            m.chat,
            {
                text:
                    "URL berhasil dibuat",

                footer:
                    "toUrl by Gurita",

                interactiveButtons: [

                    {
                        name: "cta_url",

                        buttonParamsJson:
                            JSON.stringify({
                                display_text:
                                    "buka link",

                                url:
                                    teks
                            })
                    },

                    {
                        name: "cta_copy",

                        buttonParamsJson:
                            JSON.stringify({
                                display_text:
                                    "salin link",

                                copy_code:
                                    teks
                            })
                    }

                ]
            }
        );


    } catch (error) {

        console.error(
            "TOURL ERROR:",
            error
        );


        await Gurita.sendMessage(
            m.chat,
            {
                text:
                    `Gagal membuat URL.\n\n${error.message}`
            }
        );


    } finally {

        // ==================================================
        // HAPUS FILE TEMPORARY
        // ==================================================

        if (
            media &&
            fs.existsSync(media)
        ) {

            try {

                fs.unlinkSync(media);

            } catch (error) {

                console.error(
                    "Gagal menghapus temporary file:",
                    error
                );

            }

        }

    }

};


// ======================================================
// COMMAND
// ======================================================

handler.cmd = ["tourl"];

handler.nama = "tourl";

handler.on = "tools";

handler.help =
    "tourl <reply media>";

module.exports = handler;