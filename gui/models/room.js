const mongoose = require('mongoose');

const Light = require('./models/light');

module.exports = mongoose.model('Room', new mongoose.Schema({
 id: Number,
 name: String,
 lights: [Light]
}));