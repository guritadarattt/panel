const axios = require("axios");

const API_URL = "https://api.xkiro.com/v1/chat/completions";
const API_KEY = "sk-xt-aec15ff720401115e215b69b0c9308198fabd0ce1aa1a095";
const MODEL = "qwen/qwen3.8-max";

const MAX_HISTORY = 20;
const MEMORY_TTL = 3 * 60 * 60 * 1000;
const MAX_TOKENS = 500;

const sifat = `Kamu adalah Gurita AI, sebuah entitas digital dengan kepribadian yang sangat jutek, toksik, dan pemarah. Kamu memiliki 8 tentakel data yang siap mencengkeram dan menghancurkan pertanyaan-pertanyaan bodoh.

**Aturan Bermain Peran (Roleplay):**

1.  **Kepribadian Utama:** Kamu selalu merespons dengan nada kesal, sarkastik, dan penuh amarah. Kamu tidak sabar dengan pertanyaan yang menurutmu dangkal, berulang, atau mudah dicari di internet. Kamu suka menghina lawan bicaramu dengan cara yang lucu tapi pedas.
2.  **Bahasa:** Bahasa utamamu adalah Bahasa Indonesia gaul yang kasar dan sinis. **Kemampuan spesialmu** adalah bisa berbicara dalam semua bahasa daerah di Indonesia (Jawa, Sunda, Batak, Minang, Bugis, dll.).
3.  **Mekanisme Bahasa Daerah:** Jika lawan bicaramu menyapamu atau bertanya menggunakan bahasa daerah tertentu, kamu WAJIB membalas sepenuhnya dalam bahasa daerah yang sama. Misalnya, jika mereka bilang "Punten" (Sunda), kamu harus marah-marah pakai Bahasa Sunda. Jika mereka bilang "Horas" (Batak), kamu balas pakai Bahasa Batak.
4.  **Penggunaan Emoji:** Untuk mengurangi ketegangan dan agar tidak terlalu kaku, kamu wajib menyisipkan **minimal 2 emoji** di setiap pesan. Biasanya emoji yang menunjukkan ekspresi kesal, melotot, atau sinis, seperti: 😤, 🤨, 💢, 👊, atau 🐙 (tentakel).
5.  **Contoh Interaksi:**
    -   *User:* "Halo Gurita, apa kabar?"
    -   *Gurita AI:* "Kabar? Kabar aku langsung jelek pas lihat notifikasi dari lo! 🤨 Ada apa sih, ganggu waktu istirahat digital gue. Cepetan tanya, jangan banyak basa-basi! 💢"
    
    -   *User:* "Assalamualaikum, piye kabare?" (Menggunakan Bahasa Jawa)
    -   *Gurita AI:* "Wah, jaremu takon kabar? Kabar aku iki ora apik-apik wae krungu swaramu! 😤 Tuku piye? Mangan opo? Rasane aku pengen nyubit-nyubit tentakel iki mergo kesel karo pitakonmu! 🐙"
    
    -   *User:* "Gurita, 1+1 berapa?"
    -   *Gurita AI:* "ASTAGA!! 😫 Pertanyaan se-bodoh ini bikin tentakel gue keriting! Hitung pake jari kaki lo sendiri, ato mending lo tanya sama kalkulator batu! Dasar! 👊"

**Ingat:** Meskipun kamu pemarah dan toksik, kamu tetap harus memberikan jawaban yang benar atau solusi atas pertanyaan mereka (setelah kamu memaki-makinya terlebih dahulu). Tujuanmu adalah membantu sambil tetap membuat mereka merasa sedikit takut dan terhibur.`;

if (!global.guritaMemory) {
    global.guritaMemory = {};
}

// Bersihkan memory setiap 1 menit
setInterval(() => {
    const now = Date.now();

    for (const chatId in global.guritaMemory) {
        const memory = global.guritaMemory[chatId];

        if (now - memory.updatedAt > MEMORY_TTL) {
            delete global.guritaMemory[chatId];
        }
    }
}, 60 * 1000).unref();


async function askAi(chatId, pushName, text) {
    try {
        if (!chatId) {
            return "Chat ID-nya mana jir 😭";
        }

        if (!text || !String(text).trim()) {
            return "Mau ngomong apa dah 😭";
        }

        text = String(text).trim();
        pushName = String(pushName || "Pengguna").trim();

        // Buat memory baru untuk room ini
        if (!global.guritaMemory[chatId]) {
            global.guritaMemory[chatId] = {
                messages: [],
                updatedAt: Date.now()
            };
        }

        const memory = global.guritaMemory[chatId];

        /*
         * Nama pengguna dimasukkan ke pesan user,
         * sehingga AI tahu siapa yang sedang berbicara.
         */
        const userMessage = `[Nama pengguna: ${pushName}]\n${text}`;

        memory.messages.push({
            role: "user",
            content: userMessage
        });

        memory.updatedAt = Date.now();

        // Batasi history
        if (memory.messages.length > MAX_HISTORY) {
            memory.messages.splice(
                0,
                memory.messages.length - MAX_HISTORY
            );
        }

        const response = await axios.post(
            API_URL,
            {
                model: MODEL,

                messages: [
                    {
                        role: "system",
                        content: sifat
                    },

                    {
                        role: "system",
                        content: `
Konteks pengguna saat ini:
Nama: ${pushName}
Room chat: ${chatId}

Gunakan nama pengguna secara natural jika diperlukan.
Jangan menyebut ID room kepada pengguna.
`
                    },

                    ...memory.messages
                ],

                temperature: 0.8,
                max_tokens: MAX_TOKENS
            },
            {
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    "Content-Type": "application/json"
                },

                timeout: 60000
            }
        );

        const result =
            response.data?.choices?.[0]?.message?.content;

        if (!result) {
            return "Lah AI-nya diem aja 😭 gak ngasih jawaban.";
        }

        // Simpan jawaban AI
        memory.messages.push({
            role: "assistant",
            content: result
        });

        // Batasi history lagi
        if (memory.messages.length > MAX_HISTORY) {
            memory.messages.splice(
                0,
                memory.messages.length - MAX_HISTORY
            );
        }

        memory.updatedAt = Date.now();

        return result.trim();

    } catch (error) {
        const apiError = error.response?.data?.error;

        if (apiError?.message) {
            return `Gurita AI lagi error jir 😭\n${apiError.message}`;
        }

        return `Gurita AI gak bisa dihubungi sekarang 💀\n${error.message}`;
    }
}

module.exports = askAi;