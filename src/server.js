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
const logging_interval = 30
var log_id
var logger_on = false;
const DEBUG = false;

// create application/json parser
var jsonParser = bodyParser.json();

// when we start the logger we poll and write as fast as we can, all sensors we have info for
function get_log_id(callback) {
  if(!log_id) {
    if (DEBUG) { console.log(date); }
    if (DEBUG) { console.log('not logging yet'); }
    if (DEBUG) { console.log('---starting the logger---'); }
    MongoClient.connect(mongo_url, function(err, db) {
      if (err) throw err;
      var dbo = db.db(database);
      dbo.collection(current_document).insertOne({'run_number': run_number, 'car_name': car_name, 'track_name': track_name }, function(err, res) {
        if (err) throw err;
        log_id = res.insertedId
        if (DEBUG) { console.log('--- logger started id: ' + res.insertedId + '---'); }
        db.close();
        callback(log_id);
      })
    })
  }
}

// mongo handler
function writeMongo(mongo_url, database, current_document, sensor_data) {
  MongoClient.connect(mongo_url, function(err, db) {
    if (err) throw err;
    var dbo = db.db(database);
    dbo.collection(current_document).insertOne(sensor_data, function(err, res) {
      if (err) throw err;
      if (DEBUG) { console.log("1 document inserted"); }
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
    if (DEBUG) { console.log("newvalues: "); }
    if (DEBUG) { console.log(newvalues); }
    dbo.collection(current_document).updateOne(myquery, newvalues, function(err, res) {
      if (err) throw err;
      if (DEBUG) { console.log("1 document updated"); }
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

// when we turn on the logger we should get a new id
app.get('/logger', (request, response) => {
  logger_on = !logger_on
  if(logger_on) {
      get_log_id( function(log_id) {
        if (DEBUG) { console.log("callback: " + log_id ); }
        response.json({'_id':log_id})
      })
    setInterval(() => {
      if(logger_on) {
        console.log('logger on updating log id: ' + log_id + ' date: ' + new Date());
        updateMongo(mongo_url, database, current_document, log_id)
      }
    }, logging_interval)
  }
  if(!logger_on) {
    log_id = ''
    response.json();
  }
})

app.get('/logger_status', (request, response) => {
  response.json({'logger_status':logger_on})
})

app.get('/querydata/:id',(request, response) => {
  if (DEBUG) { console.log(request.params.id); }
  if (DEBUG) { console.log('get data'); }
  MongoClient.connect(mongo_url, function(err, db) {
    if (err) throw err;
    var dbo = db.db(database);
    var o_id = new ObjectId(request.params.id)
    var query = { _id: o_id };
    dbo.collection(current_document).find(query).toArray(function(err, result) {
      if (err) throw err;
      if (DEBUG) { console.log(result); }
      response.json(result)
      db.close()
    })
  })
})

// recieve data and store into mongo
// get the post, put it into mongo
app.post('/sensor_data', jsonParser, (request, response) => {
  // store into mongo with a time stamp
  var sensor_data = { time: request.body.time, sensor: request.body.sensor_name, value: request.body.value }
  writeMongo(mongo_url, database, current_document, sensor_data);
  response.json({'ok': 'cool'})
})

app.listen(3000)