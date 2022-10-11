const User = require('../models/user');
const Post = require('../models/post');

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
    },
    createPost: async function ({ postInput }, req) {
        if (!req.isAuth) {
            const error = new Error('Not Authenticated');
            error.code = 401;
            throw error;
        }
        const errors = []
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5 })) {
            errors.push({ message: "Invalid Title!" });
        }
        if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, { min: 5 })) {
            errors.push({ message: "Invalid Content!" });
        }
        if (errors.length > 0) {
            const error = new Error("Invalid Input");
            error.data = errors;
            error.code = 422;
            throw error;
        }
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("Invalid User.");
            error.code = 401;
            throw error;
        }
        const post = new Post({
            title: postInput.title,
            content: postInput.content,
            imageUrl: postInput.imageUrl,
            creator: user
        })
        const createdPost = await post.save();
        // Add post to users posts
        user.posts.push(createdPost);
        await user.save();
        return { ...createdPost._doc, _id: createdPost._id.toString(), createdAt: createdPost.createdAt.toISOString(), updatedAt: createdPost.updatedAt.toISOString() }
    },
    posts: async function ({ page }, req) {
        if (!req.isAuth) {
            const error = new Error('Not Authenticated');
            error.code = 401;
            throw error;
        }
        if (!page) {
            page = 1;
        }
        const perPage = 2;
        const totalPosts = await Post.find().countDocuments();
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage)
            .populate('creator');

        return {
            posts: posts.map(p => {
                return {
                    ...p._doc,
                    _id: p._id.toString(),
                    createdAt: p.createdAt.toISOString(),
                    updatedAt: p.updatedAt.toISOString()
                }
            }), totalPosts: totalPosts
        }
    },
    post: async function({id}, req){
        if (!req.isAuth) {
            const error = new Error('Not Authenticated');
            error.code = 401;
            throw error;
        }
        const post = await Post.findById(id).populate('creator');// Do populate else u will get error message of "'Cannot return null for non-nullable field User.name.'" while viewing single post in UI
        console.log(post);
        if(!post){
            const error = new Error("No Post Found");
            throw error;
        }
        return {
            ...post._doc,
            _id: post._id.toString(),
            createdAt: post.createdAt.toString(),
            // updatedAt: post.updatedAt.toString()
        }
    }
};