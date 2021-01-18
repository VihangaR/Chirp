require("dotenv").config();

const { Pool } = require("pg");
const redis = require("redis");

const pool = new Pool({
    connectionString: process.env.conString
});

const redisClient = redis.createClient({
    port: process.env.redisPort,
    host: process.env.redisHost,
    password: process.env.redisPass
})

module.exports = { pool, redisClient };