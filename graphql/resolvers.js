const User = require('../models/user');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

module.exports = {
    createUser: async function ({ userInput }, req) {
        // const email = agrs.userInput.email;

        // return User.findOne().then() // always return the query function inside the resolver when not using async & await

        const errors = [];
        if (!validator.isEmail(userInput.email)) {
            errors.push({ message: "'Email is Invalid!" })
        }
        if (validator.isEmpty(userInput.password) || !validator.isLength(userInput.password, { min: 5 })) {
            errors.push({ message: "Password too short!" })
        }
        if (errors.length > 0) {
            const error = new Error("Invalid Input");
            error.data = errors;
            error.code = 422;
            throw error;
        }
        const existingUser = await User.findOne({ email: userInput.email })
        if (existingUser) {
            const error = new Error("User Exists Already!");
            throw error
        }
        const hashedPw = await bcrypt.hash(userInput.password, 12);
        const user = new User({
            email: userInput.email,
            name: userInput.name,
            password: hashedPw
        })
        const createdUser = await user.save();
        return { ...createdUser._doc, _id: createdUser._id.toString() };
    },
    login: async function ({ email, password }, req) {
        const user = await User.findOne({ email: email })
        if (!user) {
            const error = new Error("User Not Found!");
            error.code = 401;
            throw error;
        }
        const isEqual = await bcrypt.compare(password, user.password);
        if (!isEqual) {
            const error = new Error("Password Doesnt matches");
            error.code = 401;
            throw error;
        }
        const token = jwt.sign({
            userId: user._id.toString(),
            email: user.email
        }, 'somesupersecretsecret', { expiresIn: '1h' });
        return { token: token, userId: user._id.toString() };
    }
};