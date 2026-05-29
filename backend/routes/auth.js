const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOTPEmail } = require('../services/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'ai-app-secret-key-2024';

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    try {
      await sendOTPEmail(email, otp, name);
    } catch (mailErr) {
      console.error('OTP email send failed:', mailErr);
      return res.status(502).json({
        error: 'Could not send the verification email. Please try again shortly.',
        emailError: true,
      });
    }

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
