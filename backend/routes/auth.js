const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'ai-app-secret-key-2024';

// Gmail transporter for OTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'chethanrohit0045@gmail.com',
    pass: 'apbpwslaxslxagbv',
  },
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email, otp, name) {
  const mailOptions = {
    from: '"AI App" <chethanrohit0045@gmail.com>',
    to: email,
    subject: 'AI - Email Verification OTP',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f172a;border-radius:16px;color:#e2e8f0;">
        <h1 style="color:#818cf8;margin:0 0 8px;">AI</h1>
        <p style="margin:0 0 24px;color:#94a3b8;">Email Verification</p>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your verification code is:</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;padding:16px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#fff;">${otp}</span>
        </div>
        <p style="color:#94a3b8;font-size:13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;">
        <p style="color:#64748b;font-size:12px;text-align:center;">AI - Your Intelligent Code Assistant</p>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
}

// ===== REGISTER =====
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing && existing.verified) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // If exists but not verified, update the record
    const hashed = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    let user;
    if (existing && !existing.verified) {
      existing.name = name;
      existing.password = hashed;
      existing.otp = otp;
      existing.otpExpiresAt = otpExpiresAt;
      user = await existing.save();
    } else {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashed,
        otp,
        otpExpiresAt,
      });
    }

    await sendOTPEmail(email, otp, name);

    res.json({
      message: 'Registration successful. OTP sent to your email.',
      email: user.email,
      requiresVerification: true,
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ===== VERIFY OTP =====
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }
    if (user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP has expired. Please register again.' });
    }

    user.verified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Email verified successfully',
      token,
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== RESEND OTP =====
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.verified) return res.status(400).json({ error: 'Already verified' });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOTPEmail(email, otp, user.name);
    res.json({ message: 'OTP resent to your email' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== LOGIN =====
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }
    if (!user.verified) {
      return res.status(403).json({ error: 'Email not verified. Please verify your email first.', requiresVerification: true, email: user.email });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { userId: user._id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== VERIFY TOKEN =====
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password -otp -otpExpiresAt');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user: { name: user.name, email: user.email, verified: user.verified } });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
