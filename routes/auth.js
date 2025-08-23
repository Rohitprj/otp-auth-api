import express from 'express';
const router = express.Router();
import User from '../models/User.js';
import { sendOTP, verifyOTP } from '../utils/otp.js';
import jwt from 'jsonwebtoken';

// Store OTPs temporarily (in a real app, use Redis or a database)
const otpStorage = new Map(); // email -> { otp: string, expiresAt: Date }

// @route   POST /api/auth/send-otp
// @desc    Send OTP to email for registration/login
// @access  Public
router.post('/send-otp', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const otp = sendOTP(email);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes
        otpStorage.set(email, { otp, expiresAt });
        console.log(`OTP for ${email}: ${otp}`); // For testing, remove in production
        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ message: 'Failed to send OTP', error: error.message });
    }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and register/login user
// @access  Public
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const storedOtpData = otpStorage.get(email);

    if (!storedOtpData || storedOtpData.otp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > storedOtpData.expiresAt) {
        otpStorage.delete(email); // Clear expired OTP
        return res.status(400).json({ message: 'OTP expired' });
    }

    // OTP is valid, clear it
    otpStorage.delete(email);

    try {
        let user = await User.findOne({ email });

        if (!user) {
            // Register new user
            user = new User({ email });
            await user.save();
            console.log(`New user registered: ${email}`);
        } else {
            console.log(`Existing user logged in: ${email}`);
        }

        // Generate JWT
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' }, // Token expires in 1 hour
            (err, token) => {
                if (err) throw err;
                res.json({ token, message: user ? 'Logged in successfully' : 'Registered and logged in successfully' });
            }
        );

    } catch (error) {
        console.error('Error during OTP verification/user handling:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;