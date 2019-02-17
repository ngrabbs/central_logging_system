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
const DEBUG = false;
var cached_sensor_data = [];

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
function updateMongo(mongo_url, database, current_document, id, cached_sensor_data) {
  MongoClient.connect(mongo_url, function(err, db) {
    if (err) throw err;
    var dbo = db.db(database);
    var myquery = { _id: id }
    var newvalues = { $push: { data: { time: (new Date), sensors: cached_sensor_data } } }
    dbo.collection(current_document).updateOne(myquery, newvalues, function(err, res) {
      if (err) throw err;
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
  console.log('---logger info---');
  console.log(cached_sensor_data);
  logger_on = !logger_on
  if(logger_on) {
      get_log_id( function(log_id) {
        if (DEBUG) { console.log("callback: " + log_id ); }
        response.json({'_id':log_id})
      })
    setInterval(() => {
      if(logger_on) {
        console.log('logger on updating log id: ' + log_id + ' date: ' + new Date());
        updateMongo(mongo_url, database, current_document, log_id, cached_sensor_data);
      }
    }, logging_interval)
  }
  if(!logger_on) {
    log_id = ''
    cached_sensor_data = [];
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

// need a sensor listener for those actively sending back data
// we only log during certain increments so we will need to store
// the sensor data as we receive it and then log that bit of cached
// data when we call our logging routine.
// TODO: figure out how to flag if cached data is stale or fresh
app.post('/sensor_data', jsonParser, (request, response) => {
  // if the array is empty then seed it
  if (cached_sensor_data.length > 0) {
    array_index = cached_sensor_data.findIndex(function(name) {
      if(name.sensor_name === request.body.sensor_name) {
        return name;
      }
    })
    if (array_index >= 0 ) { 
      // update array 
      cached_sensor_data[array_index] = {sensor_name: request.body.sensor_name, value: request.body.value};
    } else {
      cached_sensor_data.push({sensor_name: request.body.sensor_name, value: request.body.value});
    }
  } else {
    // seed the array
    cached_sensor_data.push({sensor_name: request.body.sensor_name, value: request.body.value});
  }
  response.json()
})


// need a sensor poller for polling listening sensors

app.listen(3000)