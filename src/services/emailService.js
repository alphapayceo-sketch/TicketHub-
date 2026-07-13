const nodemailer = require('nodemailer');

// Configure email transporter - update with your email service credentials
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD
  }
});

class EmailService {
  /**
   * Send ticket confirmation email
   */
  async sendTicketConfirmation(userEmail, ticketData) {
    try {
      const htmlContent = `
        <h2>Ticket Confirmation</h2>
        <p>Thank you for purchasing a ticket!</p>
        <h3>Ticket Details:</h3>
        <ul>
          <li><strong>Event:</strong> ${ticketData.eventTitle}</li>
          <li><strong>Ticket Number:</strong> ${ticketData.ticketNumber}</li>
          <li><strong>Category:</strong> ${ticketData.category || 'General'}</li>
          ${ticketData.seatInfo ? `<li><strong>Seat:</strong> ${ticketData.seatInfo}</li>` : ''}
          <li><strong>Purchase Date:</strong> ${new Date(ticketData.purchaseDate).toLocaleDateString()}</li>
          <li><strong>Price:</strong> $${ticketData.price}</li>
        </ul>
        <p>Your QR code has been generated. Please save or screenshot this email for entry.</p>
        <p><strong>Event Date & Time:</strong> ${ticketData.eventDate} at ${ticketData.eventTime}</p>
        <p><strong>Location:</strong> ${ticketData.location}</p>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: userEmail,
        subject: `Ticket Confirmation - ${ticketData.eventTitle}`,
        html: htmlContent
      });

      return true;
    } catch (error) {
      console.error('Error sending ticket confirmation email:', error);
      throw error;
    }
  }

  /**
   * Send ticket transfer notification
   */
  async sendTransferNotification(recipientEmail, transferData) {
    try {
      const htmlContent = `
        <h2>Ticket Transfer Received</h2>
        <p>You have received a ticket transfer!</p>
        <h3>Ticket Details:</h3>
        <ul>
          <li><strong>Event:</strong> ${transferData.eventTitle}</li>
          <li><strong>From:</strong> ${transferData.fromUserName}</li>
          <li><strong>Ticket Number:</strong> ${transferData.ticketNumber}</li>
          <li><strong>Category:</strong> ${transferData.category || 'General'}</li>
          ${transferData.seatInfo ? `<li><strong>Seat:</strong> ${transferData.seatInfo}</li>` : ''}
        </ul>
        <p>The ticket is now in your account and ready to use!</p>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: recipientEmail,
        subject: `Ticket Transferred - ${transferData.eventTitle}`,
        html: htmlContent
      });

      return true;
    } catch (error) {
      console.error('Error sending transfer notification email:', error);
      throw error;
    }
  }

  /**
   * Send refund approval notification
   */
  async sendRefundNotification(userEmail, refundData) {
    try {
      const htmlContent = `
        <h2>Refund ${refundData.status.toUpperCase()}</h2>
        <p>Your refund request has been ${refundData.status}.</p>
        <h3>Refund Details:</h3>
        <ul>
          <li><strong>Event:</strong> ${refundData.eventTitle}</li>
          <li><strong>Ticket Number:</strong> ${refundData.ticketNumber}</li>
          <li><strong>Refund Amount:</strong> $${refundData.amount}</li>
          <li><strong>Status:</strong> ${refundData.status}</li>
          ${refundData.notes ? `<li><strong>Notes:</strong> ${refundData.notes}</li>` : ''}
        </ul>
        ${refundData.status === 'approved' ? '<p>The refund will be processed to your original payment method within 3-5 business days.</p>' : ''}
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: userEmail,
        subject: `Refund ${refundData.status.toUpperCase()} - ${refundData.eventTitle}`,
        html: htmlContent
      });

      return true;
    } catch (error) {
      console.error('Error sending refund notification email:', error);
      throw error;
    }
  }

  /**
   * Send event reminder email
   */
  async sendEventReminder(userEmail, eventData) {
    try {
      const htmlContent = `
        <h2>Event Reminder</h2>
        <p>Your event is coming up soon!</p>
        <h3>Event Details:</h3>
        <ul>
          <li><strong>Event:</strong> ${eventData.eventTitle}</li>
          <li><strong>Date:</strong> ${eventData.eventDate}</li>
          <li><strong>Time:</strong> ${eventData.eventTime}</li>
          <li><strong>Location:</strong> ${eventData.location}</li>
        </ul>
        <p>Don't forget to bring your ticket (QR code or physical) for entry.</p>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: userEmail,
        subject: `Reminder: ${eventData.eventTitle} is coming up!`,
        html: htmlContent
      });

      return true;
    } catch (error) {
      console.error('Error sending event reminder email:', error);
      throw error;
    }
  }

  /**
   * Send bulk operation notification
   */
  async sendBulkOperationNotification(userEmail, operationData) {
    try {
      const htmlContent = `
        <h2>Bulk Operation Completed</h2>
        <p>Your bulk operation has been completed.</p>
        <h3>Operation Details:</h3>
        <ul>
          <li><strong>Operation Type:</strong> ${operationData.operationType}</li>
          <li><strong>Target Count:</strong> ${operationData.targetCount}</li>
          <li><strong>Processed Count:</strong> ${operationData.processedCount}</li>
          <li><strong>Status:</strong> ${operationData.status}</li>
          <li><strong>Completed At:</strong> ${operationData.completedAt}</li>
        </ul>
        ${operationData.errorCount ? `<p><strong>Errors:</strong> ${operationData.errorCount}</p>` : ''}
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: userEmail,
        subject: `Bulk Operation Completed - ${operationData.operationType}`,
        html: htmlContent
      });

      return true;
    } catch (error) {
      console.error('Error sending bulk operation notification email:', error);
      throw error;
    }
  }

  /**
   * Send organizer application response
   */
  async sendOrganizerApplicationResponse(userEmail, applicationData) {
    try {
      const htmlContent = `
        <h2>Organizer Application ${applicationData.status.toUpperCase()}</h2>
        <p>Your organizer application has been ${applicationData.status}.</p>
        ${applicationData.status === 'approved' ? '<p>Welcome to the organizer community! You can now create and manage events.</p>' : ''}
        ${applicationData.status === 'rejected' ? `<p><strong>Reason:</strong> ${applicationData.reason}</p>` : ''}
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: userEmail,
        subject: `Organizer Application ${applicationData.status.toUpperCase()}`,
        html: htmlContent
      });

      return true;
    } catch (error) {
      console.error('Error sending organizer application response email:', error);
      throw error;
    }
  }

  /**
   * Test email configuration
   */
  async testConnection() {
    try {
      await transporter.verify();
      console.log('Email service configured and ready');
      return true;
    } catch (error) {
      console.error('Email service configuration error:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
