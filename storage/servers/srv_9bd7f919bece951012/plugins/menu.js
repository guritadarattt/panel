const handler = async (Gurita, m) => {

  async function getmenu() {

    let dbmn = {}

    for (let i of pitur) {
      if (typeof i !== "function") continue

      if (!dbmn[i.on]) dbmn[i.on] = []
      dbmn[i.on].push(i.nama)
    }

    let teks = ""

    // Urutkan kategori berdasarkan alfabet
    for (let x of Object.keys(dbmn).sort((a, b) => a.localeCompare(b))) {

      teks += `┏━━━ ${x.toUpperCase()} MENU ━━━┓`

      // Urutkan menu di dalam kategori berdasarkan alfabet
      for (let e of dbmn[x].sort((a, b) => a.localeCompare(b))) {
        teks += `\n┃ • ${e}`
      }

      teks += `\n┗━━━━━━━━━━━━━━━━━┛\n\n`
    }

    return teks
  }

  const menu = `Halo @${m.sender.split("@")[0]}, ini adalah menu bot

${await getmenu()}
🤖 Gurita Bot 2025`

  await Gurita.sendMessage(m.chat, {
    video: {url:"https://gmenu-two.vercel.app/thumb.mp4"},
    caption: menu,
    gifPlayback: true,
    mentions: [m.sender]
  })

await Gurita.sendMessage(m.chat, {
    audio: {url:"https://gmenu-two.vercel.app/sound.mp3"}, mimetype: "audio/mpeg",
    mentions: [m.sender]
  })

}

handler.cmd = ['menu']
handler.nama = "menu"
handler.on = "basic"
handler.help = "menu"

module.exports = handler