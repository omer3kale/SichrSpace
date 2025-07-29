function confirmationRequestReceived({ firstName }) {
  return {
    subject: "We’ve Received Your Apartment Viewing Request!",
    html: `
      <p>Hi ${firstName},</p>
      <p>Thanks for your request — we’ve received it and our team is already on it!</p>
      <p>We’re now checking availability and assigning a dedicated local viewer for your selected apartment. You’ll receive another email shortly confirming the next steps.</p>
      <p>If you have any questions in the meantime, feel free to reply to this email or reach us at <a href="mailto:sichrplace@gmail.com">sichrplace@gmail.com</a>.</p>
      <p>Talk soon,<br>The SichrPlace Team</p>
    `
  };
}

function viewingConfirmed({ firstName, viewerName, viewerDetail, dateTime, address, paymentLink, total }) {
  return {
    subject: "Your Viewing is Booked! Meet Your Apartment Viewer",
    html: `
      <p>Hi ${firstName},</p>
      <p>Great news — your apartment viewing request has been confirmed!</p>
      <p><strong>👤 Your local viewer:</strong><br>
      ${viewerName}<br>
      ${viewerDetail}</p>
      <p><strong>📅 Viewing date:</strong> ${dateTime}<br>
      <strong>🏠 Address:</strong> ${address}</p>
      <p>To finalize the service, please complete the payment securely via the link below:</p>
      <p><a href="${paymentLink}" style="background:#007bff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Pay Now</a></p>
      <p><strong>Total:</strong> €${total}</p>
      <p>Includes detailed photo/video report + personal impressions from the viewer.</p>
      <p>Once we receive the payment, we’ll send a reminder and deliver the viewing results shortly after the visit.</p>
      <p>Need help? Just reply to this email.<br>Thanks for trusting us!<br>The SichrPlace Team</p>
    `
  };
}

function viewingReady({ firstName, videoLink }) {
  return {
    subject: "Your Apartment Viewing Video & Feedback Are Here",
    html: `
      <p>Hi ${firstName},</p>
      <p>Your requested apartment viewing is now complete — and everything has been documented for you!</p>
      <p><strong>🎬 What’s included in the video report:</strong></p>
      <ul>
        <li>A full walkthrough of the apartment</li>
        <li>Impressions of the building and surroundings</li>
        <li>A quick tour of the neighborhood</li>
        <li>Answers to your specific questions and concerns</li>
      </ul>
      <p><a href="${videoLink}" style="background:#28a745;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Watch the Viewing Video</a></p>
      <p>Our local viewer also added personal notes to help you evaluate whether this home fits your needs.</p>
      <p>What do you think?<br>
      Is this apartment suitable for you? If so, we’re happy to assist you with the next steps — including communicating with the landlord and supporting the contract process.<br>
      Just reply to this email to let us know how you’d like to proceed.</p>
      <p>Looking forward to your decision!<br>The SichrPlace Team</p>
    `
  };
}

function viewingDidntWorkOut({ firstName }) {
  return {
    subject: "Not the Right Apartment? Let’s Find a Better One",
    html: `
      <p>Hi ${firstName},</p>
      <p>We’re sorry to hear that the apartment wasn’t the perfect fit — but no worries, we’re just getting started.</p>
      <p>As part of our commitment to helping you find the right home, we’re offering your next two apartment viewings completely free of charge.</p>
      <p>And if it turns out that none of the options work out for you, we’ll refund your original payment in full — no questions asked.</p>
      <p>Let us know what you'd like us to view next, and we’ll take care of the rest.</p>
      <p>Ready when you are,<br>The SichrPlace Team</p>
    `
  };
}

module.exports = {
  confirmationRequestReceived,
  viewingConfirmed,
  viewingReady,
  viewingDidntWorkOut
};