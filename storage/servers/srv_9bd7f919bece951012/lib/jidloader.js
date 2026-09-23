const path = require("path")
const fs = require("fs")


const file = path.join(__dirname,  "database", "jid.json")

const cekfile = fs.existsSync(file)


if (!cekfile) {
    fs.writeFileSync(file, JSON.stringify({}))
}

global.jidload = JSON.parse(fs.readFileSync(file))

setInterval(() => {
    fs.writeFileSync(file, JSON.stringify(global.jidload))
}, 1000)

