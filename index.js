const path = require('path');
const express = require('express')
const sqlite3 = require('sqlite3').verbose();

const mcache = require('memory-cache');
const redis = require('redis');
const flatCache = require('flat-cache');
//const memCached = require('memcached')
const PORT = process.env.PORT || 3128;
const app = express();

//-------------------------------------
// In-memory caching - useful only when the server is running, no data persistence !!!
//-------------------------------------
let memCache = new mcache.Cache();
let cacheMiddleware = duration => {
  return (req, res, next) => {
    let key = "__express__" + req.originalUrl || req.url;
    let cacheContent = memCache.get(key);
    if(cacheContent){
      res.send(cacheContent);
      return;
    } else {
      res.sendResponse = res.send;
      // duration is TTL
      res.send = body => {
        memCache.put(key, body, duration * 1000);
        res.sendResponse(body);
      };
      next();
    }
  };
};

//-------------------------------------
// Flat cache caching - file caching data persistence. Useful if server restarts then it does not have to make a db fetch for data
//                      provided the key matches with the one in file cache
//-------------------------------------
let cache = flatCache.load("productsCache", path.resolve("./cache"));
let flatCacheMiddleware = (req, res, next) => {
    let key = "__express__" + req.originalUrl || req.url;
    let cacheContent = cache.getKey(key);
    if(cacheContent){
      res.send(cacheContent);
      return;
    } else {
      res.sendResponse = res.send;
      res.send = body => {
        cache.setKey(key, body);
        cache.save();
        res.sendResponse(body);
      };
      next();
    }
};

//-------------------------------------
// app routes
//-------------------------------------
app.get('/products', flatCacheMiddleware, function(req, res){
  setTimeout( ()=> {
    let db = new sqlite3.Database('./NodeInventory.db');
    let sql = `SELECT * FROM products`;

    db.all(sql, [], (err, rows) => {
      if(err){
        throw err;
      }
      db.close();
      res.send(rows);
    });

  }, 3000);
});

//-------------------------------------
// start the server
//-------------------------------------
app.listen(PORT, function(){
  console.log(`App running on port ${PORT}`);
});