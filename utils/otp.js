import nodemailer from "nodemailer";
import otpGenerator from "otp-generator";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // Use `host` instead of `service`
  port: parseInt(process.env.SMTP_PORT), // Make sure port is a number
  secure: parseInt(process.env.SMTP_PORT) === 465, // true for port 465, false for others
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOTP = (email) => {
  const otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP for E-commerce Auth",
    html: `<p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p><p>This OTP is valid for 5 minutes.</p>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send OTP email");
    } else {
      console.log("Email sent:" + info.response);
    }
  });

  return otp;
};

// This function is not strictly needed as verification happens in auth.js,
// but keeping it for conceptual completeness if a separate verification utility was desired.
export const verifyOTP = (storedOtp, providedOtp, expiresAt) => {
  if (!storedOtp || storedOtp !== providedOtp) {
    return { success: false, message: "Invalid OTP" };
  }
  if (new Date() > expiresAt) {
    return { success: false, message: "OTP expired" };
  }
  return { success: true, message: "OTP verified successfully" };
};