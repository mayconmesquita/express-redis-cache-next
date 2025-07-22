module.exports = (function () {
  "use strict";

  var config = require("../package.json").config;

  /**  ExpressRedisCache
   *
   *  @class
   *  @description Main class
   *  @extends EventEmitter
   *  @arg {Object} options? - Options (view README)
   */

  function ExpressRedisCache(options) {
    /** The request options
     *
     *  @type Object
     */

    this.options = options || {};

    /** The entry name prefix
     *
     *  @type String
     */

    this.prefix = this.options.prefix || config.prefix;

    /** The host to connect to (default host if null)
     *
     *  @type String
     */

    this.host = this.options.host || "localhost";

    /** The port to connect to (default port if null)
     *
     *  @type Number
     */

    this.port = this.options.port || "6379";

    /** The password of Redis server (optional)
     *
     *  @type String
     */
    this.auth_pass = this.options.auth_pass;

    /** The family of the Redis server (IPv4 or IPv6)
     *  @type String
     */
    this.family = this.options.family;

    /** An alias to disable expiration for a specific route
     *
     *  var cache = new ExpressRedisCache();
     *  cache.route('page', cache.FOREVER); // cache will not expire
     *
     *  @type number
     */

    this.FOREVER = -1;

    /** Set expiration time in seconds, default is -1 (No expire)
     *  @type number
     */

    this.expire = this.options.expire || this.FOREVER;

    /** Whether or not express-redis-cache should handle redis client connection events
     *
     *  @type Boolean
     */
    this.disableRedisConnectionEvents =
      typeof this.options.disableRedisConnectionEvents === "boolean"
        ? this.options.disableRedisConnectionEvents
        : false;

    /** Whether or not express-redis-cache is connected to Redis
     *
     *  @type Boolean
     */

    this.writeClientConnected = false;

    /** Whether or not express-redis-cache is connected to Redis
     *
     *  @type Boolean
     */

    this.readClientConnected = false;

    /** The Redis Client for reading data
     *
     *  @type Object (preferably a client from the official Redis module)
     */

    this.readClient = this.options.readClient || this._createRedisClient();

    /** The Redis Client for writing data
     *
     *  @type Object (preferably a client from the official Redis module)
     */

    this.writeClient = this.options.writeClient || this._createRedisClient();

    if (!this.disableRedisConnectionEvents && this.options.writeClient) {
      this.writeClient.on("error", (error) => {
        this.emit("error", error);
      });

      this.writeClient.on("connect", () => {
        // connect means TCP connected, but not yet "ready"
        this.emit(
          "message",
          `TCP connection established to redis://${this.host}:${this.port}`
        );
      });

      this.writeClient.on("ready", () => {
        this.writeClientConnected = true;
        this.emit("connected", { host: this.host, port: this.port });
        this.emit(
          "message",
          `OK connected to redis://${this.host}:${this.port}`
        );
      });

      this.writeClient.on("end", () => {
        this.writeClientConnected = false;
        this.emit("disconnected", { host: this.host, port: this.port });
        this.emit(
          "message",
          `Disconnected from redis://${this.host}:${this.port}`
        );
      });
    }

    if (!this.disableRedisConnectionEvents && this.options.readClient) {
      this.readClient.on("error", (error) => {
        this.emit("error", error);
      });

      this.readClient.on("connect", () => {
        // connect means TCP connected, but not yet "ready"
        this.emit(
          "message",
          `TCP connection established to redis://${this.host}:${this.port}`
        );
      });

      this.readClient.on("ready", () => {
        this.readClientConnected = true;
        this.emit("connected", { host: this.host, port: this.port });
        this.emit(
          "message",
          `OK connected to redis://${this.host}:${this.port}`
        );
      });

      this.readClient.on("end", () => {
        this.readClientConnected = false;
        this.emit("disconnected", { host: this.host, port: this.port });
        this.emit(
          "message",
          `Disconnected from redis://${this.host}:${this.port}`
        );
      });
    }

    if (this.disableRedisConnectionEvents) {
      this.writeClientConnected = true;
      this.readClientConnected = true;
    }
  }

  /** Extend Event Emitter */

  require("util").inherits(ExpressRedisCache, require("events").EventEmitter);

  /**  js-comment
   *
   *  @method
   *  @description Get -
   *  @return void{Object}
   *  @arg {Object} arg - About arg
   */

  ExpressRedisCache.prototype.get = require("./ExpressRedisCache/get");

  /**  js-comment
   *
   *  @method
   *  @description This is a method
   *  @return void{Object}
   *  @arg {Object} arg - About arg
   */

  ExpressRedisCache.prototype.add = require("./ExpressRedisCache/add");

  /**  js-comment
   *
   *  @method
   *  @description This is a method
   *  @return void{Object}
   *  @arg {Object} arg - About arg
   */

  ExpressRedisCache.prototype.del = require("./ExpressRedisCache/del");

  /**  js-comment
   *
   *  @method
   *  @description This is a method
   *  @return void{Object}
   *  @arg {Object} arg - About arg
   */

  ExpressRedisCache.prototype.route = require("./ExpressRedisCache/route");

  /**  js-comment
   *
   *  @method
   *  @description This is a method
   *  @return void{Object}
   *  @arg {Object} arg - About arg
   */

  ExpressRedisCache.prototype.size = require("./ExpressRedisCache/size");

  /**  js-comment
   *
   *  @function
   *  @description Factory for ExpressRedisCache
   *  @return ExpressRedisCache
   *  @arg {Object} arg - About arg
   */

  ExpressRedisCache.init = function (options) {
    return new ExpressRedisCache(options);
  };

  /**  Create Redis Client
   *
   *  @method
   *  @description Create Redis client compatible with Redis v5
   *  @return Redis Client
   */

  ExpressRedisCache.prototype._createRedisClient = function () {
    var redis = require("redis");
    var self = this;

    // Redis v5 client configuration
    var clientConfig = {
      socket: {
        host: this.host,
        port: this.port,
      },
    };

    // Add authentication if provided
    if (this.auth_pass) {
      clientConfig.password = this.auth_pass;
    }

    if (this.family) {
      clientConfig.socket.family = this.family;
    }

    var client = redis.createClient(clientConfig);

    // Handle connection events
    client.on("error", function (error) {
      self.emit("error", error);
    });

    client.on("connect", function () {
      self.writeClientConnected = false;
      self.readClientConnected = false;
      self.emit("connected", { host: self.host, port: self.port });
      self.emit(
        "message",
        "OK connected to redis://" + self.host + ":" + self.port
      );
    });

    client.on("end", function () {
      self.writeClientConnected = false;
      self.readClientConnected = false;
      self.emit("disconnected", { host: self.host, port: self.port });
      self.emit(
        "message",
        "Disconnected from redis://" + self.host + ":" + self.port
      );
    });

    // Connect the client
    client.connect().catch(function (error) {
      self.emit("error", error);
    });

    return client;
  };

  /**  Disconnect from Redis
   *
   *  @method
   *  @description Disconnect from Redis server
   *  @return Promise
   */

  ExpressRedisCache.prototype.disconnect = function () {
    if (this.writeClient && this.writeClient.disconnect) {
      return this.writeClient.disconnect();
    }
    if (this.readClient && this.readClient.disconnect) {
      return this.readClient.disconnect();
    }
    return Promise.resolve();
  };

  return ExpressRedisCache;
})();
