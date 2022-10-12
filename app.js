const path = require('path');

// Initializing app
const express = require('express');
const app = express();

const mongoose = require('mongoose');
const cors = require('cors');
const multer = require("multer");
const bodyParser = require('body-parser');
const { graphqlHTTP } = require('express-graphql')

const graphqlSchema = require('./graphql/schema');
const graphResolver = require('./graphql/resolvers');
const auth = require('./middleware/auth');
const {clearImage} = require('./utils/file');

// const { v4: uuidv4 } = require('uuid');

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, new Date().getTime() + '-' + file.originalname); // .toLocal() doesnt work in windows
        // or
        // cb(null, uuidv4());
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
        cb(null, true)
    }
    else {
        cb(null, false);
    }
}

app.use(cors());

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // for application/json format

app.use(
    multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-AlLow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow_Headers', 'Content-Type, Authorization');
    // added for graphql error due to Option
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(auth);

app.put('/post-image', (req, res, next) => {
    if (!req.isAuth){
        throw new Error('Not authenticated!!')
    }
    if (!req.file) {
        return res.status(200).json({ message: 'No File Provided!' });
    }
    if (req.body.oldPath) {
        console.log("hii", req.body.oldPath);
        clearImage(req.body.oldPath);
    }
    return res.status(201).json({ message: 'File Stored.', filePath: req.file.path });
});


app.use('/graphql', graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphResolver,
    graphiql: true,
    formatError(err) {
        if (!err.originalError) {
            return err;
        }
        const data = err.originalError.data;
        const message = err.message || 'An Error Occured.';
        const code = err.originalError.code || 500;
        return { message: message, status: code, data: data };
    }
}))

app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({ message: message, data: data });
});

mongoose.connect('mongodb+srv://Vaibhav:23101995@cluster0.gsxn3bf.mongodb.net/messages')
    .then(result => {
        app.listen(8080);
    })
    .catch(err => {
        console.log("Error is:", err)
    })

