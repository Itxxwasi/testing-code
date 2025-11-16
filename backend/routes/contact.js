const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
    // Option 1: Use SendGrid SMTP (recommended - easier than Gmail)
    if (process.env.SENDGRID_API_KEY) {
        console.log('Using SendGrid SMTP for email delivery');
        return nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY
            }
        });
    }
    
    // Option 2: Use generic SMTP (works with most email providers)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        console.log('Using generic SMTP:', process.env.SMTP_HOST);
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }
    
    // Option 3: Fallback to Gmail (requires App Password)
    const emailUser = process.env.EMAIL_USER || 'dwatsononline.co@gmail.com';
    const emailPass = process.env.EMAIL_PASS || '';
    
    if (!emailPass) {
        console.error('No email configuration found!');
        console.error('Please set one of the following in .env:');
        console.error('  - SENDGRID_API_KEY (recommended)');
        console.error('  - SMTP_HOST, SMTP_USER, SMTP_PASS (for generic SMTP)');
        console.error('  - EMAIL_USER, EMAIL_PASS (for Gmail - requires App Password)');
        throw new Error('Email configuration not found');
    }
    
    console.log('Using Gmail service (requires App Password)');
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailUser,
            pass: emailPass
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
    });
};

// Contact form submission
router.post('/', async (req, res) => {
    try {
        console.log('Contact form submission received');
        const { name, email, phone, subject, message } = req.body;
        console.log('Form data:', { name, email, phone, subject, messageLength: message?.length });

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ 
                message: 'Please fill in all required fields (name, email, subject, message)' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // Create transporter
        const transporter = createTransporter();

        // Determine sender email
        let fromEmail = process.env.CONTACT_EMAIL || 'dwatsononline.co@gmail.com';
        if (process.env.SMTP_USER) {
            fromEmail = process.env.SMTP_USER;
        } else if (process.env.EMAIL_USER) {
            fromEmail = process.env.EMAIL_USER;
        }
        
        // Determine recipient email
        const toEmail = process.env.CONTACT_EMAIL || 'dwatsononline.co@gmail.com';
        
        // Email content
        const mailOptions = {
            from: `"D.Watson Pharmacy" <${fromEmail}>`,
            to: toEmail,
            replyTo: email,
            subject: `Contact Form: ${subject}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #1979c3; color: white; padding: 20px; text-align: center; }
                        .content { background-color: #f9f9f9; padding: 20px; }
                        .field { margin-bottom: 15px; }
                        .label { font-weight: bold; color: #1979c3; }
                        .value { margin-top: 5px; padding: 10px; background-color: white; border-left: 3px solid #1979c3; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>New Contact Form Submission</h2>
                            <p>D.Watson Pharmacy Website</p>
                        </div>
                        <div class="content">
                            <div class="field">
                                <div class="label">Name:</div>
                                <div class="value">${name}</div>
                            </div>
                            <div class="field">
                                <div class="label">Email:</div>
                                <div class="value">${email}</div>
                            </div>
                            ${phone ? `
                            <div class="field">
                                <div class="label">Phone:</div>
                                <div class="value">${phone}</div>
                            </div>
                            ` : ''}
                            <div class="field">
                                <div class="label">Subject:</div>
                                <div class="value">${subject}</div>
                            </div>
                            <div class="field">
                                <div class="label">Message:</div>
                                <div class="value">${message.replace(/\n/g, '<br>')}</div>
                            </div>
                        </div>
                        <div class="footer">
                            <p>This email was sent from the D.Watson Pharmacy contact form.</p>
                            <p>You can reply directly to this email to respond to ${name} at ${email}</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
New Contact Form Submission - D.Watson Pharmacy

Name: ${name}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}
Subject: ${subject}

Message:
${message}

---
This email was sent from the D.Watson Pharmacy contact form.
You can reply directly to this email to respond to ${name} at ${email}
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.json({ 
            success: true, 
            message: 'Thank you for contacting us! We will get back to you soon.' 
        });

    } catch (error) {
        console.error('========== CONTACT FORM ERROR ==========');
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        console.error('Error Code:', error.code);
        console.error('Error Response:', error.response);
        console.error('Full Error:', error);
        console.error('========================================');
        
        // Provide more specific error messages
        let errorMessage = 'Failed to send message. Please try again later or contact us directly.';
        
        if (error.code === 'EAUTH' || error.responseCode === 535) {
            errorMessage = 'Email authentication failed. Please check email configuration.';
            console.error('Authentication error - check EMAIL_USER and EMAIL_PASS in .env');
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection timeout. Please check your internet connection.';
        } else if (error.message && error.message.includes('Invalid login')) {
            errorMessage = 'Invalid email credentials. Please use Gmail App Password.';
            console.error('Invalid login - Gmail requires App Password, not regular password');
        }
        
        res.status(500).json({ 
            success: false, 
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;

