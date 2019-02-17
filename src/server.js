const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
var ObjectId = require('mongodb').ObjectID;
const mongo_url = "mongodb://localhost:27017/"
const database = 'pi_logger'
const current_document = 'race_logs'
const run_number = 1
const car_name = 'reggie'
const track_name = 'yello belly'
const date = new Date()
const logging_interval = 3000
var log_id
var logger_on = false;

// when we start the logger we poll and write as fast as we can, all sensors we have info for
function get_log_id(callback) {
  if(!log_id) {
    console.log(date)
    console.log('not logging yet')
    console.log('---starting the logger---')
    MongoClient.connect(mongo_url, function(err, db) {
      if (err) throw err;
      var dbo = db.db(database);
      dbo.collection(current_document).insertOne({'run_number': run_number, 'car_name': car_name, 'track_name': track_name }, function(err, res) {
        if (err) throw err;
        log_id = res.insertedId
        console.log('--- logger started id: ' + res.insertedId + '---')
        callback(log_id);
      })
    })
  }
}



// create application/json parser
var jsonParser = bodyParser.json()

// mongo handler
function writeMongo(mongo_url, database, current_document, sensor_data) {
  MongoClient.connect(mongo_url, function(err, db) {
    if (err) throw err;
    var dbo = db.db(database);
    dbo.collection(current_document).insertOne(sensor_data, function(err, res) {
      if (err) throw err;
      console.log("1 document inserted");
      db.close();
    })
  })
}

// mongo update
function updateMongo(mongo_url, database, current_document, id) {
  MongoClient.connect(mongo_url, function(err, db) {
    if (err) throw err;
    var dbo = db.db(database);
    var myquery = { _id: id }
    var newvalues = { $push: { data: {time: (new Date), sensors: [{sensor1: 1.2}, {sensor2: 2.0} ] } } }
    console.log("newvalues: ")
    console.log(newvalues)
    dbo.collection(current_document).updateOne(myquery, newvalues, function(err, res) {
      if (err) throw err;
      console.log("1 document updated");
      db.close();
    })
  })
}

// this little blob is to set some headers so you can get around
// CORS stuff, you'll be running the client on a different port
// than the rest api and chrome will complain
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );
  next();
});


// we're building our response temp data here
app.use((request, response, next) => {
  request.temp = 99.9
  request.date = new Date();
  next()
})

// we build the json and send it out as the reponse here
app.get('/', (request, response) => {
  // console.log("send out temp: " + request.temp)
  response.json({
    temp: request.temp,
    date: request.date
  })
})

// when we turn on the logger we should get a new id
app.get('/logger', (request, response) => {
  logger_on = !logger_on
  if(logger_on) {
      get_log_id( function(log_id) {
        console.log("callback: " + log_id )
        response.json({'_id':log_id})
      })
  }
  if(!logger_on) {
    log_id = ''
  }
  setInterval(() => {
    if(logger_on) {
      console.log("log id: " + log_id);
      console.log(new Date())
      console.log("LOG: " + date)
      updateMongo(mongo_url, database, current_document, log_id)
    }
  }, logging_interval)
  if(!logger_on) {
    response.json();
  }
})

// recieve data and store into mongo
// get the post, put it into mongo
app.post('/sensor_data', jsonParser, (request, response) => {
  // store into mongo with a time stamp
  var sensor_data = { time: request.body.time, sensor: request.body.sensor_name, value: request.body.value }
  writeMongo(mongo_url, database, current_document, sensor_data);
  response.json({'ok': 'cool'})
})

// query local mongo
app.get('/mongo',(request, response) => {
  console.log('call out to mongo')
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("mydb");
    var query = { address: "Park Lane 38" };
    dbo.collection("customers").find(query).toArray(function(err, result) {
      if (err) throw err;
      console.log(result)
      response.json(result)
      db.close();
    });
  });
})

app.get('/querydata/:id',(request, response) => {
  console.log(request.params.id);
  console.log('get data')
  MongoClient.connect(mongo_url, function(err, db) {
    if (err) throw err;
    var dbo = db.db(database);
    var o_id = new ObjectId(request.params.id)
    var query = { _id: o_id };
    dbo.collection(current_document).find(query).toArray(function(err, result) {
      if (err) throw err;
      console.log(result)
      response.json(result)
      db.close()
    })
  })
})

app.listen(3000)