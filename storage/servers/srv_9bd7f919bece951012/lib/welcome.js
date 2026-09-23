const getProfile = async (Gurita, num) => {
  try {
    const pp = await Gurita.profilePictureUrl(num, 'image')
    return pp
  } catch (e) {
    return "https://img1.pixhost.to/images/11669/685655494_gurita.jpg"
  }
}


const add = async (Gurita, anu , num) =>{
  const pp = await getProfile(Gurita, num)
  const text = `Halo @${num.split("@")[0]}, selamat datang di grup ${anu.subject}`
  await Gurita.sendMessage(anu.id, {image: {url: pp}, caption: text, mentions: [num]})
}

const remove = async (Gurita, anu , num) =>{
  const pp = await getProfile(Gurita, num)
  const text = `Selamat tinggal @${num.split("@")[0]}, semoga tenang di sana`
  await Gurita.sendMessage(anu.id, {image: {url: pp}, caption: text, mentions: [num]})
}

const promote = async (Gurita, anu , num) =>{
  const pp = await getProfile
  const text = `Selamat @${num.split("@")[0]}, anda telah menjadi admin`
  await Gurita.sendMessage(anu.id, {image: {url: pp}, caption: text, mentions: [num]})
}

const demote = async (Gurita, anu , num) =>{
  const pp = await getProfile(Gurita, num)
  const text = `Selamat @${num.split("@")[0]}, anda telah menjadi member`
  await Gurita.sendMessage(anu.id, {image: {url: pp}, caption: text, mentions: [num]})
}

module.exports = {add, remove, promote, demote}