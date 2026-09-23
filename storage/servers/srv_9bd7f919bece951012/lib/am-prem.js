async function getAmPrem(email) {
    const response = await fetch("https://dapjimotionpro.my.id/api/proxy-v1", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            action: "send",
            email
        })
    });

    return await response.json();
}

async function verifyAmPrem(email, verifyUrl) {
    const response = await fetch("https://dapjimotionpro.my.id/api/proxy-v1", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            action: "verify",
            email,
            link: verifyUrl
        })
    });

    return await response.json();
}

module.exports = {
    getAmPrem,
    verifyAmPrem
};
