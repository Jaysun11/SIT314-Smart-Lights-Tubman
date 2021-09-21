const mongoose = require('mongoose');
module.exports = mongoose.model('Light', new mongoose.Schema({
 roomID: Number, 
 id: Number,
 status: Boolean
}));