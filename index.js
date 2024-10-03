const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

mongoose.connect(process.env.MONGO_URL)
  .then(console.log('Successfully connected mongodb'))

const userSchema = new mongoose.Schema({
  username: {
    type: String
  },
  exercises: {
    type: Array,
    default: []
  }
})
const userModel = mongoose.model('User', userSchema)

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
function formatDateToUTC(date) {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthsOfYear = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Convert the d Huyate to UTC
  const dayOfWeek = daysOfWeek[date.getUTCDay()];
  const day = String(date.getUTCDate()).padStart(2, '0'); // Zero pad if needed
  const month = monthsOfYear[date.getUTCMonth()];
  const year = date.getUTCFullYear();

  return `${dayOfWeek} ${month} ${day} ${year}`;
}
app.post('/api/users', async function (req, res) {
  const newUser = await userModel.create({ username: req.body.username })
  res.json({
    username: newUser.username,
    _id: newUser._id
  })
})
app.get('/api/users', async function (req, res) {
  const users = await userModel.find()
  res.json(users)
})
app.post('/api/users/:_id/exercises', async (req, res) => {
  let { description, duration, date } = req.body
  if (isNaN(Date.parse(date))) {
    date = new Date();
  } else {
    date = new Date(date);
  }
  const update = {
    $push: { exercises: { date: date, duration: parseInt(duration), description } }
  }
  const user = await userModel.findByIdAndUpdate(req.params._id, update, { new: true })
  if (!user) {
    res.json({
      error: 'Invalid user id'
    })
  } else {
    res.json({
      username: user.username,
      description: user.exercises[user.exercises.length - 1].description,
      duration: user.exercises[user.exercises.length - 1].duration,
      date: formatDateToUTC(user.exercises[user.exercises.length - 1].date),
      _id: user._id
    })
  }
})
app.get('/api/users/:_id/logs', (req, res) => {
  const dateFromUtc = new Date(req.query.from)
  const dateToUtc = new Date(req.query.to)
  const query = {
    _id: req.params._id,
    exercises: {
      $elemMatch: {
        ...(req.query.from && { date: { $gte: dateFromUtc } }),
        ...(req.query.to && { date: { $lte: dateToUtc } })
      }
    }
  }
  const projection = {
    exercises: req.query.limit ? { $slice: parseInt(req.query.limit) } : 1
  }

  console.log(query)
  userModel.findOne(query, projection)
    .then(user => {
      console.log(user)
      if (!user) {
        res.json({
          err: "Invalid user id"
        })
      } else {
        console.log(user.exercises.length);
        user.exercises.map(el => {
          el.date = formatDateToUTC(el.date)
          return el
        })
        const result = {
          _id: user._id,
          username: user.username,
          from: req.query.from && formatDateToUTC(dateFromUtc),
          to: req.query.to && formatDateToUTC(dateToUtc),
          count: req.query.limit ? req.query.limit : user.exercises.length,
          log: user.exercises,
        }
        res.json(result)
      }
    })
    .catch(err => {
      console.log(err)
      res.json({
        err: "Invalid user id"
      })
    })
})
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
