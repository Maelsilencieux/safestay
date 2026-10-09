const nodemailer = require('nodemailer')
var transport = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: process.env.MAILTRAP_PORT,
  auth: {
    // "505e498d3de32b",
    user: process.env.MAILTRAP_USER ,
    pass: process.env.MAILTRAP_PASS
    // "****acd9"
  },
  tls: {
    // Contourne l'inspection SSL/TLS locale en développement
    rejectUnauthorized: false
  }
});

const sendMailRap = async (user,sub,text)=> {
  console.log(user,sub,text)
transport.sendMail({
  from:process.env.EMAIL_FROM,
  to: user,
  subject: sub,
  text: text
}, (error, info) => {
  if (error) {
    return console.log(error);
  }
  console.log("Message sent: %s", info.messageId);
});
}
module.exports= sendMailRap;
